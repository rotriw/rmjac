#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemStatementNodePublic {
    pub statements: Vec<ContentType>,
    pub source: String,
    pub creation_time: NaiveDateTime,
    pub update_time: NaiveDateTime,
    pub sample_group: Vec<(String, String)>,
    pub show_order: Vec<String>,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemStatementNodePrivate {}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemStatementNodePublicRaw {
    pub statements: Vec<ContentType>,
    pub source: String,
    pub iden: String,
    pub creation_time: NaiveDateTime,
    pub sample_group_in: Vec<String>,
    pub sample_group_out: Vec<String>,
    pub show_order: Vec<String>,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemStatementNodePrivateRaw {}

#[derive(Deserialize, Serialize, Debug, Clone, Node)]
pub struct ProblemStatementNode {
    pub node_id: i64,
    pub public: ProblemStatementNodePublic,
    pub private: ProblemStatementNodePrivate,
}

#[derive(Deserialize, Serialize, Debug, Clone, NodeRaw)]
#[node_raw(node_type = "problem_statement")]
pub struct ProblemStatementNodeRaw {
    pub public: ProblemStatementNodePublicRaw,
    pub private: ProblemStatementNodePrivateRaw,
}

impl From<Model> for ProblemStatementNode {
    fn from(model: Model) -> Self {
        ProblemStatementNode {
            node_id: model.node_id,
            public: ProblemStatementNodePublic {
                statements: model.content,
                source: model.source,
                creation_time: model.creation_time,
                update_time: model.update_time,
                sample_group: model.sample_group_in.into_iter().zip(model.sample_group_out).collect(),
                show_order: model.show_order,
            },
            private: ProblemStatementNodePrivate {},
        }
    }
}

impl From<ProblemStatementNodeRaw> for ActiveModel {
    fn from(value: ProblemStatementNodeRaw) -> Self {
        ActiveModel {
            node_id: NotSet,
            iden: Set(value.public.iden),
            source: Set(value.public.source),
            content: Set(value.public.statements),
            creation_time: Set(value.public.creation_time),
            update_time: Set(value.public.creation_time),
            sample_group_in: Set(value.public.sample_group_in),
            sample_group_out: Set(value.public.sample_group_out),
            show_order: Set(value.public.show_order),
        }
    }
}

use crate::db::entity::node::problem_statement::{ActiveModel, Column, ContentType, Entity, Model};
use crate::graph::node::{Node, NodeRaw};
use chrono::NaiveDateTime;
use macro_node_iden::{Node, NodeRaw};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::EntityTrait;
use serde::{Deserialize, Serialize};
