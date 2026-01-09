#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub struct IdenNodePublic {
    pub iden: String,
    pub weight: i64,
}

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub struct IdenNodePrivate {}

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub struct IdenNodePublicRaw {
    pub iden: String,
    pub weight: i64,
}

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub struct IdenNodePrivateRaw {}

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS, Node)]
#[ts(export)]
pub struct IdenNode {
    pub node_id: i64,
    pub public: IdenNodePublic,
    pub private: IdenNodePrivate,
}

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS, NodeRaw)]
#[ts(export)]
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
                weight: model.weight,
            },
            private: IdenNodePrivate {},
        }
    }
}

impl From<IdenNodeRaw> for ActiveModel {
    fn from(value: IdenNodeRaw) -> Self {
        ActiveModel {
            node_id: NotSet,
            iden: Set(value.public.iden),
            weight: Set(value.public.weight),
        }
    }
}

use crate::db::entity::node::iden::{ActiveModel, Column, Entity, Model};
use crate::graph::node::{Node, NodeRaw};
use macro_node_iden::{Node, NodeRaw};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::EntityTrait;
use serde::{Deserialize, Serialize};
