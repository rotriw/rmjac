#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct IdenNodePublic {
    pub iden: String,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct IdenNodePrivate {}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct IdenNodePublicRaw {
    pub iden: String,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct IdenNodePrivateRaw {}

#[derive(Deserialize, Serialize, Debug, Clone, Node)]
pub struct IdenNode {
    pub node_id: i64,
    pub public: IdenNodePublic,
    pub private: IdenNodePrivate,

}

#[derive(Deserialize, Serialize, Debug, Clone, NodeRaw)]
#[node_raw(node_type = "iden")]
pub struct IdenNodeRaw {
    pub public: IdenNodePublicRaw,
    pub private: IdenNodePrivateRaw,
}

impl From<Model> for IdenNode {
    fn from(model: Model) -> Self {
        IdenNode {
            node_id: model.node_id,
            public: IdenNodePublic {
                iden: model.iden,
            },
            private: IdenNodePrivate {},
        }
    }
}

impl From<IdenNodeRaw> for ActiveModel {
    fn from(value: IdenNodeRaw) -> Self {
        ActiveModel {
            node_id: NotSet,
            iden: Set(value.public.iden)
        }
    }
}

use crate::db::entity::node::iden::{Model, ActiveModel, Entity, Column};
use crate::graph::node::{Node, NodeRaw};
use chrono::NaiveDateTime;
use macro_node_iden::{Node, NodeRaw};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::EntityTrait;
use serde::{Deserialize, Serialize};