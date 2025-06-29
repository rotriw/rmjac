use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};
use crate::{db::entity::node::problem_statement::{self, ContentType}, graph::node::{problem::{statement::{ProblemStatementNodePrivateRaw, ProblemStatementNodePublicRaw, ProblemStatementNodeRaw}, ProblemNode, ProblemNodePrivateRaw, ProblemNodePublicRaw, ProblemNodeRaw}, NodeRaw}, Result};


pub async fn create_problem(
    db: &DatabaseConnection,
    problem_statement: Vec<ContentType>,
    problem_statement_source: String,
    problem_statement_iden: String,
    problem_name: String,
) -> Result<ProblemNode> {
    let problem_node = ProblemNodeRaw {
        public: ProblemNodePublicRaw {
            name: problem_name,
            creation_time: chrono::Utc::now().naive_utc(),
        },
        private: ProblemNodePrivateRaw {},
    }.save(db).await?;

    let problem_statement = ProblemStatementNodeRaw {
        public: ProblemStatementNodePublicRaw {
            creation_time: chrono::Utc::now().naive_utc(),
            statements: problem_statement,
            source: problem_statement_source,
            iden: problem_statement_iden,
        },
        private: ProblemStatementNodePrivateRaw {},
    }.save(db).await?;
    Ok(problem_node)
}