use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};
use serde::{Deserialize, Serialize};

use crate::db::entity::node::problem_source;
use crate::graph::node::{Node, NodeRaw};

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemSourceNodePublic {
    pub name: String,
    pub iden: String,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemSourceNodePrivate {}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemSourceNodePublicRaw {
    pub name: String,
    pub iden: String,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemSourceNodePrivateRaw {}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemSourceNode {
    pub node_id: i64,
    pub public: ProblemSourceNodePublic,
    pub private: ProblemSourceNodePrivate,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemSourceNodeRaw {
    pub public: ProblemSourceNodePublicRaw,
    pub private: ProblemSourceNodePrivateRaw,
}

impl From<problem_source::Model> for ProblemSourceNode {
    fn from(model: problem_source::Model) -> Self {
        ProblemSourceNode {
            node_id: model.node_id,
            public: ProblemSourceNodePublic {
                name: model.name,
                iden: model.iden,
            },
            private: ProblemSourceNodePrivate {},
        }
    }
}

impl From<ProblemSourceNodeRaw> for problem_source::ActiveModel {
    fn from(value: ProblemSourceNodeRaw) -> Self {
        problem_source::ActiveModel {
            node_id: NotSet,
            name: Set(value.public.name),
            iden: Set(value.public.iden),
        }
    }
}

impl Node for ProblemSourceNode {
    async fn from_db(
        db: &sea_orm::DatabaseConnection,
        node_id: i64,
    ) -> Result<Self, crate::error::CoreError>
    where
        Self: Sized,
    {
        let result = problem_source::Entity::find()
            .filter(problem_source::Column::NodeId.eq(node_id))
            .one(db)
            .await?
            .ok_or(crate::error::CoreError::NotFound("NodeId".to_string()))?;
        Ok(result.into())
    }

    fn get_node_id(&self) -> i64 {
        self.node_id
    }
}

impl NodeRaw<ProblemSourceNode, problem_source::Model, problem_source::ActiveModel> for ProblemSourceNodeRaw {
    fn get_node_type(&self) -> &str {
        "problem_source"
    }
    fn get_node_id_column(&self) -> <<problem_source::ActiveModel as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Column{
        problem_source::Column::NodeId
    }
}
