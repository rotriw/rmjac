use crate::{
    db::entity::edge,
    graph::{
        edge::{
            problem_limit::{ProblemLimitEdgeQuery, ProblemLimitEdgeRaw},
            problem_statement::ProblemStatementEdgeRaw,
            problem_tag::ProblemTagEdgeRaw,
            EdgeQuery, EdgeRaw,
        },
        node::{
            problem::{
                statement::{ProblemStatementNode, ProblemStatementNodeRaw},
                limit::{ProblemLimitNode, ProblemLimitNodeRaw},
                tag::{ProblemTagNode, ProblemTagNodeRaw},
                ProblemNode, ProblemNodePrivateRaw, ProblemNodePublicRaw, ProblemNodeRaw,
            },
            Node, NodeRaw,
        },
    },
    Result,
};
use redis::Commands;
use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter};
use serde::{Deserialize, Serialize};
use crate::graph::node::problem_source::{ProblemSourceNode, ProblemSourceNodePrivateRaw, ProblemSourceNodePublicRaw, ProblemSourceNodeRaw};

pub async fn create_problem(
    db: &DatabaseConnection,
    problem_statement: Vec<(ProblemStatementNodeRaw, ProblemLimitNodeRaw)>,
    tag: Vec<ProblemTagNodeRaw>,
    problem_name: String,
) -> Result<ProblemNode> {
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
        let (problem_statement_node_raw, problem_limit_node_raw) = data;
        let problem_statement_node = problem_statement_node_raw.save(db).await?;
        let problem_limit_node = problem_limit_node_raw.save(db).await?;
        // problem -statement-> statement
        ProblemStatementEdgeRaw {
            u: problem_node.node_id,
            v: problem_statement_node.node_id,
            copyright_risk: 0, // default
        }
        .save(db)
        .await?;
        // 暂时允许访问题目 = 访问所有题面
        // statement -limit-> limit
        ProblemLimitEdgeRaw {
            u: problem_statement_node.node_id,
            v: problem_limit_node.node_id,
        }
        .save(db)
        .await?;
    }
    for tag_node in tag {
        let tag_node = tag_node.save(db).await?;
        ProblemTagEdgeRaw {
            u: problem_node.node_id,
            v: tag_node.node_id,
        }
        .save(db)
        .await?;
    }
    Ok(problem_node)
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemModel {
    pub problem_node: ProblemNode,
    pub problem_statement_node: Vec<(ProblemStatementNode, ProblemLimitNode)>,
    pub tag: Vec<ProblemTagNode>,
}


pub async fn create_problem_source(db: &DatabaseConnection, name: &str, iden: &str) -> Result<ProblemSourceNode> {
    ProblemSourceNodeRaw {
        public: ProblemSourceNodePublicRaw {
            name: name.to_string(),
            iden: iden.to_string(),
        },
        private: ProblemSourceNodePrivateRaw {},
    }.save(db).await
}

pub async fn view_problem(
    db: &DatabaseConnection,
    redis: &mut redis::Connection,
    problem_node_id: i64,
) -> Result<ProblemModel> {
    if let Ok(value) = redis.get::<_, String>(format!("problem_{}", problem_node_id)) {
        if let Ok(problem_model) = serde_json::from_str::<ProblemModel>(value.as_str()) {
            return Ok(problem_model);
        }
    }
    let problem_node = ProblemNode::from_db(db, problem_node_id).await?;
    let problem_statement_node_id: Vec<i64> = edge::problem_statement::Entity::find()
        .filter(edge::problem_statement::Column::UNodeId.eq(problem_node.node_id))
        .all(db)
        .await?
        .into_iter()
        .map(|edge| edge.v_node_id)
        .collect();
    let mut problem_statement_node = vec![];
    for node_id in problem_statement_node_id {
        let statement_node = ProblemStatementNode::from_db(db, node_id).await?;
        let problem_limit_node = ProblemLimitEdgeQuery::get_v(statement_node.node_id, db).await?;
        let problem_limit_node = problem_limit_node[0];
        let problem_limit_node = ProblemLimitNode::from_db(db, problem_limit_node).await?;
        problem_statement_node.push((statement_node, problem_limit_node));
    }
    let tag_nodes: Vec<i64> = edge::problem_tag::Entity::find()
        .filter(edge::problem_tag::Column::UNodeId.eq(problem_node.node_id))
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
        problem_node: problem_node,
        problem_statement_node,
        tag,
    };
    let serialized = serde_json::to_string(&problem_model)?;
    redis.set::<_, _, ()>(format!("problem_{}", problem_node_id), serialized)?;
    redis.expire::<_, ()>(format!("problem_{}", problem_node_id), 3600)?;
    Ok(problem_model)
}
