#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub struct ProblemSourceNodePublic {
    pub name: String,
    pub iden: String,
}

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub struct ProblemSourceNodePrivate {}

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub struct ProblemSourceNodePublicRaw {
    pub name: String,
    pub iden: String,
}

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub struct ProblemSourceNodePrivateRaw {}

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS, Node)]
#[ts(export)]
pub struct ProblemSourceNode {
    pub node_id: i64,
    pub public: ProblemSourceNodePublic,
    pub private: ProblemSourceNodePrivate,
}

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS, NodeRaw)]
#[ts(export)]
#[node_raw(node_type = "problem_source")]
pub struct ProblemSourceNodeRaw {
    pub public: ProblemSourceNodePublicRaw,
    pub private: ProblemSourceNodePrivateRaw,
}

impl From<Model> for ProblemSourceNode {
    fn from(model: Model) -> Self {
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

impl From<ProblemSourceNodeRaw> for ActiveModel {
    fn from(value: ProblemSourceNodeRaw) -> Self {
        ActiveModel {
            node_id: NotSet,
            name: Set(value.public.name),
            iden: Set(value.public.iden),
        }
    }
}

use crate::db::entity::node::problem_source::{ActiveModel, Column, Entity, Model};
use crate::graph::node::{Node, NodeRaw};
use macro_node_iden::{Node, NodeRaw};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::EntityTrait;
use serde::{Deserialize, Serialize};
