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

#[derive(Deserialize, Serialize, Debug, Clone, Node)]
pub struct ProblemNode {
    pub node_id: i64,
    pub public: ProblemNodePublic,
    pub private: ProblemNodePrivate,
}

#[derive(Deserialize, Serialize, Debug, Clone, NodeRaw)]
#[node_raw(node_type = "problem")]
pub struct ProblemNodeRaw {
    pub public: ProblemNodePublicRaw,
    pub private: ProblemNodePrivateRaw,
}

impl From<Model> for ProblemNode {
    fn from(model: Model) -> Self {
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

impl From<ProblemNodeRaw> for ActiveModel {
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

pub mod limit;
pub mod statement;
pub mod tag;


use crate::db::entity::node::problem::{
    ActiveModel, Model, Entity, Column
};
use macro_node_iden::{Node, NodeRaw};
use sea_orm::EntityTrait;
use serde::{Deserialize, Serialize};
use crate::graph::node::{Node, NodeRaw};
use chrono::NaiveDateTime;