
#[derive(Debug, Clone, Serialize, Deserialize, Default, Node)]
pub struct SubmitInfoNode {
    pub node_id: i64,
    pub public: SubmitInfoNodePublic,
    pub private: SubmitInfoNodePrivate,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SubmitInfoNodePublic {
    pub default_judge_option: HashMap<String, String>
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SubmitInfoNodePrivate {}


#[derive(Debug, Clone, Serialize, Deserialize, Default, NodeRaw)]
#[node_raw(node_type = "submit_info")]
pub struct SubmitInfoNodeRaw {
    pub public: SubmitInfoNodePublic,
    pub private: SubmitInfoNodePrivate,
}

impl From<SubmitInfoNodeRaw> for ActiveModel {
    fn from(raw: SubmitInfoNodeRaw) -> Self {
        ActiveModel {
            node_id: NotSet,
            option_data: Set(serde_json::to_string(&raw.public.default_judge_option).unwrap_or_default()),
        }
    }
}

impl From<Model> for SubmitInfoNode {
    fn from(value: Model) -> Self {
        Self {
            node_id: value.node_id,
            public: SubmitInfoNodePublic {
                default_judge_option: serde_json::from_str(&value.option_data).unwrap_or_default(),
            },
            private: SubmitInfoNodePrivate {

            },
        }
    }

}

use std::collections::HashMap;
use sea_orm::{NotSet, Set};
use crate::graph::node::Node;
use crate::graph::node::NodeRaw;
use serde::{Deserialize, Serialize};
use macro_node_iden::{Node, NodeRaw};
use crate::db::entity::node::submit_info::{ActiveModel, Column, Entity, Model};
use sea_orm::EntityTrait;