#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct $1Public {
    $3
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct $1Private {
    $4
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct $1PublicRaw {
    $5
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct $1PrivateRaw {
    $6
}

#[derive(Deserialize, Serialize, Debug, Clone, Node)]
pub struct $1 {
    pub node_id: i64,
    pub public: $1Public,
    pub private: $1Private,
    $7
}

#[derive(Deserialize, Serialize, Debug, Clone, NodeRaw)]
#[node_raw(node_type = "problem_statement")]
pub struct $1Raw {
    pub public: $1PublicRaw,
    pub private: $1PrivateRaw,
    $8
}

impl From<Model> for $1 {
    fn from(model: Model) -> Self {
        $1 {
            node_id: model.node_id,
            public: $1Public {
                $9
            },
            private: $1Private {
                $10
            },
        }
    }
}

impl From<$1Raw> for ActiveModel {
    fn from(value: $1Raw) -> Self {
        ActiveModel {
            $11
        }
    }
}

use crate::db::entity::node::$2::{ContentType, Model, ActiveModel, Entity, Column};
use crate::graph::node::{Node, NodeRaw};
use chrono::NaiveDateTime;
use macro_node_iden::{Node, NodeRaw};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::EntityTrait;
use serde::{Deserialize, Serialize};