#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct TrainingProblemNodePublic {
    pub description: String,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct TrainingProblemNodePrivate {
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct TrainingProblemNodePublicRaw {
    pub description: String,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct TrainingProblemNodePrivateRaw {
}

#[derive(Deserialize, Serialize, Debug, Clone, Node)]
pub struct TrainingProblemNode {
    pub node_id: i64,
    pub public: TrainingProblemNodePublic,
    pub private: TrainingProblemNodePrivate,
}

#[derive(Deserialize, Serialize, Debug, Clone, NodeRaw)]
#[node_raw(node_type = "training_problem")]
pub struct TrainingProblemNodeRaw {
    pub public: TrainingProblemNodePublicRaw,
    pub private: TrainingProblemNodePrivateRaw,
}

impl From<Model> for TrainingProblemNode {
    fn from(model: Model) -> Self {
        TrainingProblemNode {
            node_id: model.node_id,
            public: TrainingProblemNodePublic {
                description: model.description,
            },
            private: TrainingProblemNodePrivate {
            },
        }
    }
}

impl From<TrainingProblemNodeRaw> for ActiveModel {
    fn from(value: TrainingProblemNodeRaw) -> Self {
        use sea_orm::ActiveValue::{NotSet, Set};
        Self {
            node_id: NotSet,
            description: Set(value.public.description),
        }
    }
}

use crate::db::entity::node::training_problem::{ActiveModel, Column, Entity, Model};
use crate::graph::node::{Node, NodeRaw};
use macro_node_iden::{Node, NodeRaw};
use sea_orm::EntityTrait;
use serde::{Deserialize, Serialize};