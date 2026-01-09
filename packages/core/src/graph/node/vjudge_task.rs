use crate::db::entity::node::vjudge_task::{ActiveModel, Column, Entity, Model};
use crate::graph::node::{Node, NodeRaw};
use chrono::NaiveDateTime;
use macro_node_iden::{Node, NodeRaw};
use sea_orm::EntityTrait;
use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub struct VjudgeTaskNodePublic {
    pub status: String,
    pub log: String,
    #[ts(type = "string")]
    pub created_at: NaiveDateTime,
    #[ts(type = "string")]
    pub updated_at: NaiveDateTime,
}

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub struct VjudgeTaskNodePrivate {}

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub struct VjudgeTaskNodePublicRaw {
    pub status: String,
    pub log: String,
}

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub struct VjudgeTaskNodePrivateRaw {}

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS, Node)]
#[ts(export)]
pub struct VjudgeTaskNode {
    pub node_id: i64,
    pub public: VjudgeTaskNodePublic,
    pub private: VjudgeTaskNodePrivate,
}

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS, NodeRaw)]
#[ts(export)]
#[node_raw(node_type = "vjudge_task")]
pub struct VjudgeTaskNodeRaw {
    pub public: VjudgeTaskNodePublicRaw,
    pub private: VjudgeTaskNodePrivateRaw,
}

impl From<VjudgeTaskNodeRaw> for ActiveModel {
    fn from(value: VjudgeTaskNodeRaw) -> Self {
        use sea_orm::ActiveValue::{NotSet, Set};
        Self {
            node_id: NotSet,
            status: Set(value.public.status),
            log: Set(value.public.log),
            created_at: Set(chrono::Utc::now().naive_utc()),
            updated_at: Set(chrono::Utc::now().naive_utc()),
        }
    }
}

impl From<Model> for VjudgeTaskNode {
    fn from(model: Model) -> Self {
        VjudgeTaskNode {
            node_id: model.node_id,
            public: VjudgeTaskNodePublic {
                status: model.status,
                log: model.log,
                created_at: model.created_at.and_utc().naive_utc(),
                updated_at: model.updated_at.and_utc().naive_utc(),
            },
            private: VjudgeTaskNodePrivate {},
        }
    }
}
