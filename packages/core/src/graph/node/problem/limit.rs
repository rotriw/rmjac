#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub struct ProblemLimitNodePublic {
    pub time_limit: i64,   // ms
    pub memory_limit: i64, // kb
}

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub struct ProblemLimitNodePrivate {}

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub struct ProblemLimitNodePublicRaw {
    pub time_limit: i64,   // ms
    pub memory_limit: i64, // kb
}

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub struct ProblemLimitNodePrivateRaw {}

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS, Node)]
#[ts(export)]
pub struct ProblemLimitNode {
    pub node_id: i64,
    pub public: ProblemLimitNodePublic,
    pub private: ProblemLimitNodePrivate,
}

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS, NodeRaw)]
#[ts(export)]
#[node_raw(node_type = "problem_limit")]
pub struct ProblemLimitNodeRaw {
    pub public: ProblemLimitNodePublicRaw,
    pub private: ProblemLimitNodePrivateRaw,
}

impl From<Model> for ProblemLimitNode {
    fn from(model: Model) -> Self {
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

impl From<ProblemLimitNodeRaw> for ActiveModel {
    fn from(value: ProblemLimitNodeRaw) -> Self {
        ActiveModel {
            node_id: NotSet,
            time_limit: Set(value.public.time_limit),
            memory_limit: Set(value.public.memory_limit),
        }
    }
}

use macro_node_iden::{Node, NodeRaw};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::EntityTrait;
use serde::{Deserialize, Serialize};

use crate::db::entity::node::problem_limit::{ActiveModel, Column, Entity, Model};
use crate::graph::node::{Node, NodeRaw};
