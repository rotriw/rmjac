use crate::db::entity::node::vjudge_task::{ActiveModel, Model, Entity, Column};
use crate::graph::node::{Node, NodeRaw};
use chrono::NaiveDateTime;
use sea_orm::EntityTrait;
use macro_node_iden::{Node, NodeRaw};
use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct VjudgeTaskNodePublic {
    pub status: String,
    pub log: String,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct VjudgeTaskNodePrivate {}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct VjudgeTaskNodePublicRaw {
    pub status: String,
    pub log: String,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct VjudgeTaskNodePrivateRaw {}

#[derive(Deserialize, Serialize, Debug, Clone, Node)]
pub struct VjudgeTaskNode {
    pub node_id: i64,
    pub public: VjudgeTaskNodePublic,
    pub private: VjudgeTaskNodePrivate,
}

#[derive(Deserialize, Serialize, Debug, Clone, NodeRaw)]
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

