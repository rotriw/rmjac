use crate::{
    db::entity::node::problem_statement::ContentType,
    graph::{
        edge::{
            perm_manage::{ManagePerm, PermManageEdgeRaw}, perm_view::{PermViewEdgeRaw, ViewPerm}, problem_limit::ProblemLimitEdgeRaw, problem_statement::ProblemStatementEdgeRaw, EdgeRaw
        },
        node::{
            problem::{
                limit::{ProblemLimitNode, ProblemLimitNodeRaw}, statement::{
                    ProblemStatementNode, ProblemStatementNodePrivateRaw, ProblemStatementNodePublicRaw, ProblemStatementNodeRaw
                }, tag::ProblemTagNode, ProblemNode, ProblemNodePrivate, ProblemNodePrivateRaw, ProblemNodePublic, ProblemNodePublicRaw, ProblemNodeRaw
            },
            NodeRaw,
        },
    },
    Result,
};
use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};

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
        }.save(db).await?;
        PermManageEdgeRaw {
            u: problem_node.node_id,
            v: problem_statement_node.node_id,
            perms: vec![ManagePerm::All],
        }.save(db).await?;
        ProblemLimitEdgeRaw {
            u: problem_statement_node.node_id,
            v: problem_limit_node.node_id
        }.save(db).await?;
    }
    Ok(problem_node)
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemModel {
    pub problem_node: ProblemNode,
    pub problem_statement_node: Vec<(ProblemStatementNode, ProblemLimitNode)>,
    pub tag: Vec<ProblemTagNode>,
}

// pub async fn view_problem(
//     db: &DatabaseConnection,
//     problem_node_id: i64,
// ) -> Result<ProblemModel> {

// }