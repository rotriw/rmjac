use crate::{
    db::entity::edge,
    graph::{
        edge::{
            perm_manage::{ManagePerm, PermManageEdgeRaw},
            perm_view::{PermViewEdgeRaw, ViewPerm},
            problem_limit::ProblemLimitEdgeRaw,
            problem_statement::ProblemStatementEdgeQuery,
            EdgeRaw,
        },
        node::{
            problem::{
                limit::{ProblemLimitNode, ProblemLimitNodeRaw},
                statement::{ProblemStatementNode, ProblemStatementNodeRaw},
                tag::ProblemTagNode,
                ProblemNode, ProblemNodePrivateRaw, ProblemNodePublicRaw, ProblemNodeRaw,
            },
            Node, NodeRaw,
        },
    },
    Result,
};
use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter};
use serde::{Deserialize, Serialize};
use tap::Conv;

pub async fn create_problem(
    db: &DatabaseConnection,
    problem_statement: Vec<(ProblemStatementNodeRaw, ProblemLimitNodeRaw)>,
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
        // problem statement -> limit
        // problem -> statement
        PermViewEdgeRaw {
            u: problem_node.node_id,
            v: problem_statement_node.node_id,
            perms: vec![ViewPerm::All],
        }
        .save(db)
        .await?;
        PermManageEdgeRaw {
            u: problem_node.node_id,
            v: problem_statement_node.node_id,
            perms: vec![ManagePerm::All],
        }
        .save(db)
        .await?;
        ProblemLimitEdgeRaw {
            u: problem_statement_node.node_id,
            v: problem_limit_node.node_id,
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

pub async fn view_problem(db: &DatabaseConnection, problem_node_id: i64) -> Result<ProblemModel> {
    let problem_node = ProblemNode::from_db(db, problem_node_id).await?;
    let problem_statement_nodes: Vec<i64> = edge::problem_statement::Entity::find()
        .filter(edge::problem_statement::Column::UNodeId.eq(problem_node.node_id))
        .all(db)
        .await?
        .into_iter()
        .map(|edge| edge.v_node_id)
        .collect();

    Err(crate::error::CoreError::NotFound("123".to_string()))
}
