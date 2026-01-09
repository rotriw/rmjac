#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub struct TrainingNodePublic {
    pub name: String,              // 题单名称
    pub iden: String,              // 题单标识
    pub description: String,       // 题单描述
    #[ts(type = "string")]
    pub start_time: NaiveDateTime, // 题单开始时间
    #[ts(type = "string")]
    pub end_time: NaiveDateTime,   // 题单结束时间
    pub training_type: String,     // 题单
}

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub struct TrainingNodePrivate {
    pub description: String, // 题单备注
}

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub struct TrainingNodePublicRaw {
    pub name: String,
    pub iden: String,
    pub description: String,
    #[ts(type = "string")]
    pub start_time: NaiveDateTime,
    #[ts(type = "string")]
    pub end_time: NaiveDateTime,
    pub training_type: String,
}

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub struct TrainingNodePrivateRaw {
    pub description: String,
}

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS, Node)]
#[ts(export)]
pub struct TrainingNode {
    pub node_id: i64,
    pub public: TrainingNodePublic,
    pub private: TrainingNodePrivate,
}

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS, NodeRaw)]
#[ts(export)]
#[node_raw(node_type = "training")]
pub struct TrainingNodeRaw {
    pub public: TrainingNodePublicRaw,
    pub private: TrainingNodePrivateRaw,
}

impl From<Model> for TrainingNode {
    fn from(model: Model) -> Self {
        TrainingNode {
            node_id: model.node_id,
            public: TrainingNodePublic {
                name: model.name,
                iden: model.iden,
                description: model.description_public,
                start_time: model.start_time,
                end_time: model.end_time,
                training_type: model.training_type,
            },
            private: TrainingNodePrivate {
                description: model.description_private,
            },
        }
    }
}

impl From<TrainingNodeRaw> for ActiveModel {
    fn from(value: TrainingNodeRaw) -> Self {
        use sea_orm::ActiveValue::{NotSet, Set};
        Self {
            node_id: NotSet,
            name: Set(value.public.name),
            iden: Set(value.public.iden),
            description_public: Set(value.public.description),
            description_private: Set(value.private.description),
            start_time: Set(value.public.start_time),
            end_time: Set(value.public.end_time),
            training_type: Set(value.public.training_type),
        }
    }
}

use crate::db::entity::node::training::{ActiveModel, Column, Entity, Model};
use crate::graph::node::{Node, NodeRaw};
use chrono::NaiveDateTime;
use macro_node_iden::{Node, NodeRaw};
use sea_orm::EntityTrait;
use serde::{Deserialize, Serialize};

pub mod problem;
