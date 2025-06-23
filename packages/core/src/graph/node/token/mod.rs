use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};

use crate::db;

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct TokenNode {
    pub node_id: i64,
    pub node_iden: String,
    pub public: TokenNodePublic,
    pub private: TokenNodePrivate,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct TokenNodePublic {
    pub token_type: String,
    pub token_expiration: NaiveDateTime,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct TokenNodePrivate {
    pub token: String,
}

impl From<db::entity::node::token::Model> for TokenNode {
    fn from(model: db::entity::node::token::Model) -> Self {
        TokenNode {
            node_id: model.node_id,
            node_iden: model.token_iden,
            public: TokenNodePublic {
                token_type: model.token_type,
                token_expiration: model.token_expiration.and_utc().naive_utc(),
            },
            private: TokenNodePrivate {
                token: model.token,
            },
        }
    }
}
