use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};

use db::entity::node::token::ActiveModel as TokenNodeActiveModel;
use db::entity::node::token::Column as TokenNodeColumn;
use db::entity::node::token::Model as TokenNodeModel;

use crate::db;
use crate::graph::node::NodeRaw;

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct TokenNodePublic {
    pub token_type: String,
    pub token_expiration: NaiveDateTime,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct TokenNodePrivate {
    pub token: String,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct TokenNodePublicRaw {
    pub token_type: String,
    pub token_expiration: Option<NaiveDateTime>,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct TokenNodePrivateRaw {
    pub token: String,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct TokenNode {
    pub node_id: i64,
    pub public: TokenNodePublic,
    pub private: TokenNodePrivate,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct TokenNodeRaw {
    pub iden: String,
    pub service: String,
    pub public: TokenNodePublicRaw,
    pub private: TokenNodePrivateRaw,
}

impl From<TokenNodeRaw> for TokenNodeActiveModel {
    fn from(value: TokenNodeRaw) -> Self {
        use sea_orm::ActiveValue::{NotSet, Set};
        Self {
            node_id: NotSet,
            token: Set(value.private.token),
            token_type: Set(value.public.token_type),
            token_expiration: match value.public.token_expiration {
                Some(exp) => Set(exp),
                None => NotSet,
            },
            service: Set(value.service),
            token_iden: Set(value.iden),
        }
    }
}

impl From<TokenNodeModel> for TokenNode {
    fn from(model: TokenNodeModel) -> Self {
        TokenNode {
            node_id: model.node_id,
            public: TokenNodePublic {
                token_type: model.token_type,
                token_expiration: model.token_expiration.and_utc().naive_utc(),
            },
            private: TokenNodePrivate { token: model.token },
        }
    }
}

impl NodeRaw<TokenNode, TokenNodeModel, TokenNodeActiveModel> for TokenNodeRaw {
    fn get_node_id_column(
        &self,
    ) -> <<TokenNodeActiveModel as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Column
    {
        TokenNodeColumn::NodeId
    }
    fn get_node_type(&self) -> &str {
        "token"
    }
}
