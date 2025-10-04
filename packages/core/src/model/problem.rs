use crate::db::entity::edge::{problem_statement, problem_tag};
use crate::db::entity::node::problem_statement::ContentType;
use crate::error::CoreError;
use crate::graph::action::get_node_type;
use crate::graph::edge::problem_limit::{ProblemLimitEdgeQuery, ProblemLimitEdgeRaw};
use crate::graph::edge::problem_statement::{ProblemStatementEdgeQuery, ProblemStatementEdgeRaw};
use crate::graph::edge::problem_tag::ProblemTagEdgeRaw;
use crate::graph::edge::{EdgeQuery, EdgeRaw};
use crate::graph::node::problem::limit::{
    ProblemLimitNode, ProblemLimitNodePrivateRaw, ProblemLimitNodePublicRaw, ProblemLimitNodeRaw,
};
use crate::graph::node::problem::statement::{
    ProblemStatementNode, ProblemStatementNodePrivateRaw, ProblemStatementNodePublicRaw,
    ProblemStatementNodeRaw,
};
use crate::graph::node::problem::tag::{
    ProblemTagNode, ProblemTagNodePrivateRaw, ProblemTagNodePublicRaw, ProblemTagNodeRaw,
};
use crate::graph::node::problem::{
    ProblemNode, ProblemNodePrivateRaw, ProblemNodePublicRaw, ProblemNodeRaw,
};
use crate::graph::node::{Node, NodeRaw};
use crate::{Result, db};
use chrono::Utc;
use redis::Commands;
use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter};
use serde::{Deserialize, Serialize};
use crate::service::iden::{create_iden, get_node_ids_from_iden};

type ProblemIdenString = String;

pub async fn create_problem_schema(
    db: &DatabaseConnection,
    problem_statement: Vec<(
        ProblemStatementNodeRaw,
        ProblemLimitNodeRaw,
        Option<ProblemIdenString>,
    )>,
    tag_node_id: Vec<i64>,
    problem_name: String,
) -> Result<ProblemNode> {
    log::info!("Start to create problem schema");
    let problem_node = ProblemNodeRaw {
        public: ProblemNodePublicRaw {
            name: problem_name,
            creation_time: Utc::now().naive_utc(),
        },
        private: ProblemNodePrivateRaw {},
    }
    .save(db)
    .await?;
    let problem_node_id = problem_node.node_id;
    for data in problem_statement {
        add_problem_statement_for_problem(db, problem_node_id, data).await?;
    }
    for tag_node in tag_node_id {
        ProblemTagEdgeRaw {
            u: problem_node.node_id,
            v: tag_node,
        }
        .save(db)
        .await?;
    }
    log::info!(
        "Problem schema have been created. problem_node_id: {}",
        problem_node.node_id
    );
    Ok(problem_node)
}

pub async fn add_problem_statement_for_problem(
    db: &DatabaseConnection,
    problem_node_id: i64,
    problem_statement: (
        ProblemStatementNodeRaw,
        ProblemLimitNodeRaw,
        Option<ProblemIdenString>,
    ),
) -> Result<()> {
    log::debug!("Creating problem statement node and limit node");
    let (
        problem_statement_node_raw,
        problem_limit_node_raw,
        iden
    ) = problem_statement;
    let problem_statement_node = problem_statement_node_raw.save(db).await?;
    let problem_limit_node = problem_limit_node_raw.save(db).await?;
    // problem -statement-> statement
    log::debug!("Creating problem statement edge");
    ProblemStatementEdgeRaw {
        u: problem_node_id,
        v: problem_statement_node.node_id,
        copyright_risk: 0, // default
    }
        .save(db)
        .await?;
    if let Some(iden) = iden {
        create_iden(format!("problem/{}", iden).as_str(), vec![problem_statement_node.node_id, problem_node_id], db).await?;
    }
    // 暂时允许访问题目 = 访问所有题面
    // statement -limit-> limit
    log::debug!("Add problem limit edge");
    ProblemLimitEdgeRaw {
        u: problem_statement_node.node_id,
        v: problem_limit_node.node_id,
    }
    .save(db)
    .await?;
    Ok(())
}

pub async fn delete_problem_statement_for_problem(
    db: &DatabaseConnection,
    problem_node_id: i64,
    problem_statement_node_id: i64,
) -> Result<()> {
    log::debug!("Deleting problem statement node and limit node");
    ProblemStatementEdgeQuery::destroy_edge(db, problem_node_id, problem_statement_node_id).await?;
    log::debug!("Problem statement edge have been deleted");
    Ok(())
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemStatementProp {
    pub statement_source: String,       // used to statement description
    pub problem_iden: Option<String>,   // used to create problem_iden node
    pub problem_statements: Vec<ContentType>,
    pub time_limit: i64,
    pub memory_limit: i64,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct CreateProblemProps {
    pub problem_iden: String,
    pub problem_name: String,
    pub problem_statement: Vec<ProblemStatementProp>,
    pub creation_time: Option<chrono::NaiveDateTime>,
    pub tags: Vec<String>,
}

pub async fn create_problem(
    db: &DatabaseConnection,
    problem: CreateProblemProps,
) -> Result<ProblemNode> {
    log::info!("Creating new problem, name:{}.", &problem.problem_name);
    let problem_node_raw = ProblemNodeRaw {
        public: ProblemNodePublicRaw {
            name: problem.problem_name.clone(),
            creation_time: problem.creation_time.unwrap_or(Utc::now().naive_utc()),
        },
        private: ProblemNodePrivateRaw {},
    };
    log::info!("Problem Node Raw: {problem_node_raw:?}");
    let mut problem_statement_node_raw = vec![];
    for statement in problem.problem_statement {
        problem_statement_node_raw.push((
            ProblemStatementNodeRaw {
                public: ProblemStatementNodePublicRaw {
                    statements: statement.problem_statements,
                    source: statement.statement_source,
                    creation_time: problem.creation_time.unwrap_or(Utc::now().naive_utc()),
                    iden: problem.problem_iden.clone(),
                },
                private: ProblemStatementNodePrivateRaw {},
            }
            .clone(),
            ProblemLimitNodeRaw {
                public: ProblemLimitNodePublicRaw {
                    time_limit: statement.time_limit,
                    memory_limit: statement.memory_limit,
                },
                private: ProblemLimitNodePrivateRaw {},
            }
            .clone(),
            statement.problem_iden,
        ));
    }
    log::info!("Problem Statements Raw: {problem_statement_node_raw:?}");
    let mut tag_ids = vec![];
    for i in problem.tags {
        use db::entity::node::problem_tag::Column as ProblemTagColumn;
        log::trace!("Finding tag {i} in database");
        let id = ProblemTagNode::from_db_filter(db, ProblemTagColumn::TagName.eq(&i)).await?;
        tag_ids.push(if id.len() == 0 {
            log::debug!("Cannot find tag {i}, creating new.");
            ProblemTagNodeRaw {
                public: ProblemTagNodePublicRaw {
                    tag_name: i,
                    tag_description: "".to_string(),
                },
                private: ProblemTagNodePrivateRaw {},
            }
            .save(db)
            .await?
            .node_id
        } else {
            id[0].node_id
        });
    }
    log::info!("Final Problem Tags ids: {problem_statement_node_raw:?}");
    log::info!("Data collected");
    let result = create_problem_schema(
        db,
        problem_statement_node_raw,
        tag_ids,
        problem.problem_name.clone(),
    )
    .await?;
    log::info!("Start to create problem_source for problem");
    create_iden(
        format!("problem/{}", problem.problem_iden).as_str(),
        vec![result.node_id],
        db,
    ).await?;
    log::info!("The problem {} have been created.", &problem.problem_name);
    Ok(result)
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemModel {
    pub problem_node: ProblemNode,
    pub problem_statement_node: Vec<(ProblemStatementNode, ProblemLimitNode)>,
    pub tag: Vec<ProblemTagNode>,
}

/**

*/
pub async fn get_problem(
    db: &DatabaseConnection,
    redis: &mut redis::Connection,
    iden: &str,
) -> Result<(ProblemModel, i64)> {
    let node_ids = get_node_ids_from_iden(iden, db, redis).await?;
    if node_ids.len() == 0 {
        return Err(CoreError::NotFound("Cannot find problem with this iden".to_string()));
    }
    let (problem_node, statement_node) = if node_ids.len() == 1 {
        (node_ids[0], node_ids[0])
    } else {
        let mut problem_node = -1;
        let mut statement_node = -1;
        for node_id in node_ids {
            let node_type = get_node_type(db, node_id).await?;
            if node_type == "problem" {
                problem_node = node_id;
            } else if node_type == "problem_statement" {
                statement_node = node_id;
            }
        }
        if problem_node == -1 {
            return Err(CoreError::NotFound("Cannot find problem with this iden".to_string()));
        }
        if statement_node == -1 {
            log::warn!("{iden} There are many node for this iden, We can find a problem node, and there are many other iden, but we cannot find a statement node!");
        }
        (problem_node, statement_node)
    };
    Ok((get_problem_model(db, redis, problem_node).await?, statement_node))
}

/**
* 题目数据
*/
pub async fn get_problem_model(
    db: &DatabaseConnection,
    redis: &mut redis::Connection,
    problem_node_id: i64,
) -> Result<ProblemModel> {
    if let Ok(value) = redis.get::<_, String>(format!("p_{problem_node_id}")) {
        if let Ok(problem_model) = serde_json::from_str::<ProblemModel>(value.as_str()) {
            return Ok(problem_model);
        }
    }
    let problem_node = ProblemNode::from_db(db, problem_node_id).await?;
    let problem_statement_node_id: Vec<i64> = problem_statement::Entity::find()
        .filter(problem_statement::Column::UNodeId.eq(problem_node.node_id))
        .all(db)
        .await?
        .into_iter()
        .map(|edge| edge.v_node_id)
        .collect();
    let mut problem_statement_node = vec![];
    for node_id in problem_statement_node_id {
        let statement_node = ProblemStatementNode::from_db(db, node_id).await?;
        let problem_limit_node = ProblemLimitEdgeQuery::get_v(statement_node.node_id, db).await?[0];
        let problem_limit_node = ProblemLimitNode::from_db(db, problem_limit_node).await?;
        problem_statement_node.push((statement_node, problem_limit_node));
    }
    let tag_nodes: Vec<i64> = problem_tag::Entity::find()
        .filter(problem_tag::Column::UNodeId.eq(problem_node.node_id))
        .all(db)
        .await?
        .into_iter()
        .map(|edge| edge.v_node_id)
        .collect();
    let mut tag = vec![];
    for tag_node_id in tag_nodes {
        let tag_node = ProblemTagNode::from_db(db, tag_node_id).await?;
        tag.push(tag_node);
    }
    let problem_model = ProblemModel {
        problem_node,
        problem_statement_node,
        tag,
    };
    let serialized = serde_json::to_string(&problem_model)?;
    redis.set::<_, _, ()>(format!("p_{problem_node_id}"), serialized)?;
    redis.expire::<_, ()>(format!("p_{problem_node_id}"), 3600)?;
    Ok(problem_model)
}

pub async fn refresh_problem_node_cache(redis: &mut redis::Connection, node_id: i64) -> Result<()> {
    redis.del::<_, ()>(format!("p_{node_id}"))?;
    Ok(())
}
pub async fn modify_problem_statement(
    db: &DatabaseConnection,
    redis: &mut redis::Connection,
    node_id: i64,
    new_content: Vec<ContentType>,
) -> Result<ProblemStatementNode> {
    use db::entity::node::problem_statement::Column::Content;
    let result = ProblemStatementNode::from_db(db, node_id)
        .await?
        .modify(db, Content, new_content)
        .await?;
    let problem_node_id = ProblemStatementEdgeQuery::get_u_one(node_id, db).await;
    if let Ok(problem_node_id) = problem_node_id {
        refresh_problem_node_cache(redis, problem_node_id).await?;
    }
    Ok(result)
}

pub async fn modify_problem_statement_source(
    db: &DatabaseConnection,
    redis: &mut redis::Connection,
    node_id: i64,
    new_source: String,
) -> Result<ProblemStatementNode> {
    use db::entity::node::problem_statement::Column::Source;
    let result = ProblemStatementNode::from_db(db, node_id)
        .await?
        .modify(db, Source, new_source)
        .await?;
    let problem_node_id = ProblemStatementEdgeQuery::get_u_one(node_id, db).await;
    if let Ok(problem_node_id) = problem_node_id {
        refresh_problem_node_cache(redis, problem_node_id).await?;
    }
    Ok(result)
}
