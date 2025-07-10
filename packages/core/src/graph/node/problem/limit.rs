use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};
use serde::{Deserialize, Serialize};

use crate::db::entity::node::problem_limit;
use crate::graph::node::{Node, NodeRaw};

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemLimitNodePublic {
    pub time_limit: i64,   // ms
    pub memory_limit: i64, // kb
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemLimitNodePrivate {}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemLimitNodePublicRaw {
    pub time_limit: i64,   // ms
    pub memory_limit: i64, // kb
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemLimitNodePrivateRaw {}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemLimitNode {
    pub node_id: i64,
    pub public: ProblemLimitNodePublic,
    pub private: ProblemLimitNodePrivate,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemLimitNodeRaw {
    pub iden: String,
    pub public: ProblemLimitNodePublicRaw,
    pub private: ProblemLimitNodePrivateRaw,
}

impl From<problem_limit::Model> for ProblemLimitNode {
    fn from(model: problem_limit::Model) -> Self {
        ProblemLimitNode {
            node_id: model.node_id,
            public: ProblemLimitNodePublic {
                time_limit: model.time_limit,
                memory_limit: model.memory_limit,
            },
            private: ProblemLimitNodePrivate {},
        }
    }
}

impl From<ProblemLimitNodeRaw> for problem_limit::ActiveModel {
    fn from(value: ProblemLimitNodeRaw) -> Self {
        problem_limit::ActiveModel {
            node_id: NotSet,
            time_limit: Set(value.public.time_limit),
            memory_limit: Set(value.public.memory_limit),
        }
    }
}

impl Node for ProblemLimitNode {
    async fn from_db(
        db: &sea_orm::DatabaseConnection,
        node_id: i64,
    ) -> Result<Self, crate::error::CoreError>
    where
        Self: Sized,
    {
        let result = problem_limit::Entity::find()
            .filter(problem_limit::Column::NodeId.eq(node_id))
            .one(db)
            .await?
            .ok_or(crate::error::CoreError::NotFound("NodeId".to_string()))?;
        Ok(result.into())
    }

    fn get_node_id(&self) -> i64 {
        self.node_id
    }
}

impl NodeRaw<ProblemLimitNode, problem_limit::Model, problem_limit::ActiveModel>
    for ProblemLimitNodeRaw
{
    fn get_node_type(&self) -> &str {
        "problem_limit"
    }
    fn get_node_id_column(&self) -> <<problem_limit::ActiveModel as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Column{
        problem_limit::Column::NodeId
    }
}
