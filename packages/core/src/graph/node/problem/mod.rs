use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};

pub mod statement;

use crate::graph::node::Node;
use crate::Result;

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemNode {
    pub node_id: i64,
    pub node_iden: String,
    pub public: ProblemNodePublic,
    pub private: ProblemNodePrivate,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemNodePublic {
    pub name: String,
    pub creation_time: NaiveDateTime,
    pub creation_order: i64,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemNodePrivate {}

impl<'a> Node<'a> for ProblemNode {
    fn get_node_id(&self) -> i64 {
        self.node_id
    }

    fn get_node_iden(&self) -> String {
        self.node_iden.clone()
    }

    async fn from_db(db: &sea_orm::DatabaseConnection, node_id: i64) -> Result<Self>
    where
        Self: Sized,
    {
        let model = crate::db::entity::node::problem::get_problem_by_nodeid(db, node_id).await?;
        Ok(model.into())
    }

    fn get_outdegree(&self, _db: &sea_orm::DatabaseConnection) -> Result<i64> {
        Ok(0) // [TODO]
    }
}

impl From<crate::db::entity::node::problem::Model> for ProblemNode {
    fn from(model: crate::db::entity::node::problem::Model) -> Self {
        ProblemNode {
            node_id: model.node_id,
            node_iden: model.node_iden,
            public: ProblemNodePublic {
                name: model.name,
                creation_time: model.creation_time,
                creation_order: model.creation_order,
            },
            private: ProblemNodePrivate {},
        }
    }
}
