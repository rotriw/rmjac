use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};

use crate::graph::node::Node;
use crate::Result;

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemStatementNode {
    pub node_id: i64,
    pub node_iden: String,
    pub public: ProblemStatementNodePublic,
    pub private: ProblemStatementNodePrivate,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemStatementNodePublic {
    pub statement_iden: String,
    pub statement_source: String,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemStatementNodePrivate {}

impl Node for ProblemStatementNode {
    fn get_node_id(&self) -> i64 {
        self.node_id
    }

    fn get_node_iden(&self) -> String {
        self.node_iden.clone()
    }

    async fn from_db(db: &DatabaseConnection, node_id: i64) -> Result<Self>
    where
        Self: Sized,
    {
        // [TODO]
        Ok(ProblemStatementNode {
            node_id,
            node_iden: format!("problem_statement_{}", node_id),
            public: ProblemStatementNodePublic {
                statement_iden: "example_statement_iden".to_string(),
                statement_source: "example_source".to_string(),
            },
            private: ProblemStatementNodePrivate {},
        })
    }

}
