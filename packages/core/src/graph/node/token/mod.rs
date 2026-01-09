#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub struct TokenNodePublic {
    pub token_type: String,
    #[ts(type = "string")]
    pub token_expiration: NaiveDateTime,
}

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub struct TokenNodePrivate {
    pub token: String,
}

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub struct TokenNodePublicRaw {
    pub token_type: String,
    #[ts(type = "string")]
    pub token_expiration: Option<NaiveDateTime>,
}

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub struct TokenNodePrivateRaw {
    pub token: String,
}

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS, Node)]
#[ts(export)]
pub struct TokenNode {
    pub node_id: i64,
    pub public: TokenNodePublic,
    pub private: TokenNodePrivate,
}

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS, NodeRaw)]
#[ts(export)]
#[node_raw(node_type = "token")]
pub struct TokenNodeRaw {
    pub iden: String,
    pub service: String,
    pub public: TokenNodePublicRaw,
    pub private: TokenNodePrivateRaw,
}

impl From<TokenNodeRaw> for ActiveModel {
    fn from(value: TokenNodeRaw) -> Self {
        use sea_orm::ActiveValue::{NotSet, Set};
        Self {
            node_id: NotSet,
            token: Set(value.private.token),
            token_type: Set(value.public.token_type),
            token_expiration: match value.public.token_expiration {
                Some(exp) => Set(exp),
                None => Set(chrono::Utc::now().naive_utc()),
            },
            service: Set(value.service),
            token_iden: Set(value.iden),
        }
    }
}

impl From<Model> for TokenNode {
    fn from(model: Model) -> Self {
        Self {
            node_id: model.node_id,
            public: TokenNodePublic {
                token_type: model.token_type,
                token_expiration: model.token_expiration,
            },
            private: TokenNodePrivate { token: model.token },
        }
    }
}

use crate::db;
use crate::graph::node::Node;
use crate::graph::node::NodeRaw;
use chrono::NaiveDateTime;
use db::entity::node::token::{ActiveModel, Column, Entity, Model};
use macro_node_iden::{Node, NodeRaw};
use sea_orm::EntityTrait;
use serde::{Deserialize, Serialize};
