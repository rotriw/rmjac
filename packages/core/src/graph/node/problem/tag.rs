#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemTagNodePublic {
    pub tag_name: String,
    pub tag_description: String,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemTagNodePrivate {}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemTagNodePublicRaw {
    pub tag_name: String,
    pub tag_description: String,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemTagNodePrivateRaw {}

#[derive(Deserialize, Serialize, Debug, Clone, Node)]
pub struct ProblemTagNode {
    pub node_id: i64,
    pub public: ProblemTagNodePublic,
    pub private: ProblemTagNodePrivate,
}

#[derive(Deserialize, Serialize, Debug, Clone, NodeRaw)]
#[node_raw(node_type = "problem_tag")]
pub struct ProblemTagNodeRaw {
    pub public: ProblemTagNodePublicRaw,
    pub private: ProblemTagNodePrivateRaw,
}

impl From<Model> for ProblemTagNode {
    fn from(model: Model) -> Self {
        ProblemTagNode {
            node_id: model.node_id,
            public: ProblemTagNodePublic {
                tag_name: model.tag_name,
                tag_description: model.tag_description,
            },
            private: ProblemTagNodePrivate {},
        }
    }
}

impl From<ProblemTagNodeRaw> for ActiveModel {
    fn from(value: ProblemTagNodeRaw) -> Self {
        ActiveModel {
            node_id: NotSet,
            tag_name: Set(value.public.tag_name),
            tag_description: Set(value.public.tag_description),
        }
    }
}

use crate::db::entity::node::problem_tag::{ActiveModel, Column, Entity, Model};
use crate::graph::node::{Node, NodeRaw};
use macro_node_iden::{Node, NodeRaw};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::EntityTrait;
use serde::{Deserialize, Serialize};
