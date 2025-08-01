use crate::db::entity::edge::{problem_statement, problem_tag};
use crate::db::entity::node::problem_statement::ContentType;
use crate::error::CoreError;
use crate::graph::action::get_node_type;
use crate::graph::edge::iden::{IdenEdgeQuery, IdenEdgeRaw};
use crate::graph::edge::problem_limit::{ProblemLimitEdgeQuery, ProblemLimitEdgeRaw};
use crate::graph::edge::problem_statement::{ProblemStatementEdgeQuery, ProblemStatementEdgeRaw};
use crate::graph::edge::problem_tag::ProblemTagEdgeRaw;
use crate::graph::edge::{EdgeQuery, EdgeRaw};
use crate::graph::node::iden::{IdenNode, IdenNodePrivateRaw, IdenNodePublicRaw, IdenNodeRaw};
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
use crate::graph::node::problem_source::{
    ProblemSourceNode, ProblemSourceNodePrivateRaw, ProblemSourceNodePublicRaw,
    ProblemSourceNodeRaw,
};
use crate::graph::node::{Node, NodeRaw};
use crate::{Result, db};
use async_recursion::async_recursion;
use chrono::Utc;
use redis::Commands;
use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter};
use serde::{Deserialize, Serialize};

pub async fn create_problem_schema(
    db: &DatabaseConnection,
    problem_statement: Vec<(
        ProblemStatementNodeRaw,
        ProblemLimitNodeRaw,
        (Option<String>, Option<String>),
    )>,
    tag_node_id: Vec<i64>,
    problem_name: String,
) -> Result<ProblemNode> {
    log::info!("Start to create problem schema");
    let problem_node = ProblemNodeRaw {
        public: ProblemNodePublicRaw {
            name: problem_name,
            creation_time: chrono::Utc::now().naive_utc(),
        },
        private: ProblemNodePrivateRaw {},
    }
    .save(db)
    .await?;
    for data in problem_statement {
        log::debug!("Creating problem statement node and limit node");
        let (problem_statement_node_raw, problem_limit_node_raw, (source, iden)) = data;
        let problem_statement_node = problem_statement_node_raw.save(db).await?;
        let problem_limit_node = problem_limit_node_raw.save(db).await?;
        // problem -statement-> statement
        log::debug!("Creating problem statement edge");
        ProblemStatementEdgeRaw {
            u: problem_node.node_id,
            v: problem_statement_node.node_id,
            copyright_risk: 0, // default
        }
        .save(db)
        .await?;
        if let Some(source) = source
            && let Some(iden) = iden
        {
            log::debug!("create problem_statement iden connection");
            let problem_iden_node = create_problem_iden(
                db,
                source.as_str(),
                iden.as_str(),
                problem_statement_node.node_id,
            )
            .await?;
            log::debug!("Iden Node have been created. {problem_iden_node:?}");
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

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemStatementProp {
    pub statement_source: String,       // used to statement description
    pub problem_source: Option<String>, // used to create problem_source node
    pub problem_iden: Option<String>,   // used to create problem_iden node
    pub problem_statements: Vec<ContentType>,
    pub time_limit: i64,
    pub memory_limit: i64,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct CreateProblemProps {
    pub problem_source: String,
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
            (statement.problem_source, statement.problem_iden),
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
    create_problem_iden(
        db,
        &problem.problem_source,
        &problem.problem_iden,
        result.node_id,
    )
    .await?;
    log::info!("The problem {} have been created.", &problem.problem_name);
    Ok(result)
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemModel {
    pub problem_node: ProblemNode,
    pub problem_statement_node: Vec<(ProblemStatementNode, ProblemLimitNode)>,
    pub tag: Vec<ProblemTagNode>,
}

pub async fn create_problem_source(
    db: &DatabaseConnection,
    name: &str,
    iden: &str,
) -> Result<ProblemSourceNode> {
    ProblemSourceNodeRaw {
        public: ProblemSourceNodePublicRaw {
            name: name.to_string(),
            iden: iden.to_string(),
        },
        private: ProblemSourceNodePrivateRaw {},
    }
    .save(db)
    .await
}

pub async fn create_problem_iden(
    db: &DatabaseConnection,
    problem_source: &str,
    iden: &str,
    problem_node_or_statement_id: i64,
) -> Result<IdenNode> {
    use db::entity::node::problem_source::Column as ProblemSourceColumn;
    let iden_node = IdenNodeRaw {
        public: IdenNodePublicRaw {
            iden: iden.to_string(),
        },
        private: IdenNodePrivateRaw {},
    }
    .save(db)
    .await?;
    let problem_source_node =
        ProblemSourceNode::from_db_filter(db, ProblemSourceColumn::Iden.eq(problem_source)).await?;
    IdenEdgeRaw {
        u: problem_source_node[0].node_id,
        v: iden_node.node_id,
        iden: iden.to_string(),
    }
    .save(db)
    .await?;
    IdenEdgeRaw {
        u: iden_node.node_id,
        v: problem_node_or_statement_id,
        iden: "DONE_FOUND_FROM_DATABASE".to_string(),
    }
    .save(db)
    .await?;
    Ok(iden_node)
}

#[async_recursion(?Send)]
pub async fn get_end_iden(db: &DatabaseConnection, iden: &str, id: i64) -> Result<i64> {
    use db::entity::edge::iden::Column as IdenColumn;
    if iden == "" {
        log::trace!("Found iden, node_id:{}", id);
        return Ok(IdenEdgeQuery::get_v_filter(
            id,
            IdenColumn::Iden.eq("DONE_FOUND_FROM_DATABASE"),
            db,
        )
        .await?[0]);
    }
    log::trace!("Find end iden for id: {}, iden: {}", id, iden);
    let mut now_iden = "".to_string();
    for i in 0..iden.len() {
        now_iden.push(iden.chars().nth(i).unwrap());
        let result =
            IdenEdgeQuery::get_v_filter(id, IdenColumn::Iden.eq(now_iden.as_str()), db).await?;
        if !result.is_empty() {
            let next_iden = iden[i + 1..].to_string();
            let result = get_end_iden(db, &next_iden, result[0]).await?;
            if result != 0 {
                return Ok(result);
            }
        }
    }
    Ok(0)
}

/**
Result<(ProblemModel, i64)>: 最终题目的模型，选中的题面(若指向题目则返回problem_id）。

*/
pub async fn get_problem(
    db: &DatabaseConnection,
    redis: &mut redis::Connection,
    iden: &str,
) -> Result<(ProblemModel, i64)> {
    use db::entity::node::problem_source::Column as ProblemSourceColumn;
    let mut saved = false;
    let node_id = 'scope: {
        if let Ok(value) = redis.get::<_, String>(format!("pi_{iden}")) {
            log::trace!("load from redis: pi_{iden}");
            if let Ok(problem_model) = value.as_str().parse::<i64>() {
                saved = true;
                break 'scope problem_model;
            }
        }
        let mut now_iden = "".to_string();
        for i in 0..iden.len() {
            now_iden.push(iden.chars().nth(i).unwrap());
            let result = ProblemSourceNode::from_db_filter(
                db,
                ProblemSourceColumn::Iden.eq(now_iden.as_str()),
            )
            .await?;
            if !result.is_empty() {
                let problem_source_node = result[0].clone();
                log::trace!("Problem source node id: {}", problem_source_node.node_id);
                let next_iden = iden[i + 1..].to_string();
                let result = get_end_iden(db, &next_iden, problem_source_node.node_id).await?;
                if result != 0 {
                    break 'scope result;
                }
            }
        }
        -1
    };
    log::trace!("Problem node id: {node_id}");
    if node_id == -1 {
        return Err(CoreError::NotFound("Problem not found".to_string()));
    }
    if !saved {
        redis.set::<_, _, ()>(format!("pi_{iden}"), node_id.to_string())?;
    }
    let node_type = get_node_type(db, node_id).await?;
    let problem_node = if node_type == "problem_statement" {
        ProblemStatementEdgeQuery::get_u_one(node_id, db).await?
    } else {
        node_id
    };
    Ok((view_problem(db, redis, problem_node).await?, node_id))
}

pub async fn view_problem(
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
