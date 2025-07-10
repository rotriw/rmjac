use chrono::NaiveDateTime;
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};
use serde::{Deserialize, Serialize};

pub mod limit;
pub mod statement;
pub mod tag;

use crate::db::entity::node::problem;
use crate::graph::node::{Node, NodeRaw};

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemNodePublic {
    pub name: String,
    pub creation_time: NaiveDateTime,
    pub creation_order: i64,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemNodePrivate {}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemNodePublicRaw {
    pub name: String,
    pub creation_time: NaiveDateTime,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemNodePrivateRaw {}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemNode {
    pub node_id: i64,
    pub public: ProblemNodePublic,
    pub private: ProblemNodePrivate,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemNodeRaw {
    pub public: ProblemNodePublicRaw,
    pub private: ProblemNodePrivateRaw,
}

impl From<crate::db::entity::node::problem::Model> for ProblemNode {
    fn from(model: crate::db::entity::node::problem::Model) -> Self {
        ProblemNode {
            node_id: model.node_id,
            public: ProblemNodePublic {
                name: model.name,
                creation_time: model.creation_time,
                creation_order: model.creation_order,
            },
            private: ProblemNodePrivate {},
        }
    }
}

impl From<ProblemNodeRaw> for problem::ActiveModel {
    fn from(value: ProblemNodeRaw) -> Self {
        use sea_orm::ActiveValue::{NotSet, Set};
        Self {
            node_id: NotSet,
            name: Set(value.public.name),
            content_public: NotSet,
            content_private: NotSet,
            creation_time: Set(value.public.creation_time),
            creation_order: NotSet,
        }
    }
}

impl
    NodeRaw<
        ProblemNode,
        crate::db::entity::node::problem::Model,
        crate::db::entity::node::problem::ActiveModel,
    > for ProblemNodeRaw
{
    fn get_node_id_column(&self) -> <<crate::db::entity::node::problem::ActiveModel as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Column{
        problem::Column::NodeId
    }

    fn get_node_type(&self) -> &str {
        "problem"
    }
}

impl Node for ProblemNode {
    fn get_node_id(&self) -> i64 {
        self.node_id
    }

    async fn from_db(db: &sea_orm::DatabaseConnection, node_id: i64) -> crate::Result<Self>
    where
        Self: Sized,
    {
        let model = problem::Entity::find()
            .filter(problem::Column::NodeId.eq(node_id))
            .one(db)
            .await?;
        match model {
            Some(model) => Ok(model.into()),
            None => Err(crate::error::CoreError::NotFound(format!(
                "Problem node with id {} not found",
                node_id
            ))),
        }
    }
}
