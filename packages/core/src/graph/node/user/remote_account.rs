#[derive(Deserialize, Serialize, Debug, Clone)]
pub enum VjudgeAuth {
    Password(String),
    Token(String),
}

#[derive(Deserialize, Serialize, Debug, Clone, PartialEq)]
pub enum RemoteMode {
    PublicAccount = 0,
    OnlySync = 1,
    SyncCode = 2,
}

impl From<i32> for RemoteMode {
    fn from(value: i32) -> Self {
        match value {
            0 => RemoteMode::PublicAccount,
            2 => RemoteMode::SyncCode,
            1 => RemoteMode::OnlySync,
            _ => RemoteMode::SyncCode,
        }
    }
}


#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct VjudgeNodePublic {
    pub platform: String,
    pub verified_code: String,
    pub verified: bool,
    pub iden: String,
    pub creation_time: NaiveDateTime,
    pub updated_at: NaiveDateTime,
    pub remote_mode: RemoteMode,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct VjudgeNodePrivate {
    pub auth: Option<VjudgeAuth>,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct VjudgeNodePublicRaw {
    pub platform: String,
    pub verified_code: String,
    pub verified: bool,
    pub iden: String,
    pub creation_time: NaiveDateTime,
    pub updated_at: NaiveDateTime,
    pub remote_mode: RemoteMode,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct VjudgeNodePrivateRaw {
    pub auth: Option<VjudgeAuth>,
}

#[derive(Deserialize, Serialize, Debug, Clone, Node)]
pub struct VjudgeNode {
    pub node_id: i64,
    pub public: VjudgeNodePublic,
    pub private: VjudgeNodePrivate,
}

#[derive(Deserialize, Serialize, Debug, Clone, NodeRaw)]
#[node_raw(node_type = "user_remote_account")]
pub struct VjudgeNodeRaw {
    pub public: VjudgeNodePublicRaw,
    pub private: VjudgeNodePrivateRaw,
}

impl From<VjudgeNodeRaw> for ActiveModel {
    fn from(value: VjudgeNodeRaw) -> Self {
        use sea_orm::ActiveValue::{NotSet, Set};
        let auth = value.private.auth;
        let auth = match auth {
            Some(VjudgeAuth::Password(p)) => Some(format!("p_{}", p)),
            Some(VjudgeAuth::Token(t)) => Some(format!("t_{}", t)),
            None => None,
        };
        Self {
            node_id: NotSet,
            user_iden: Set(value.public.iden),
            platform: Set(value.public.platform),
            verified_code: Set(value.public.verified_code),
            verified: Set(value.public.verified),
            auth: Set(auth),
            use_mode: Set(value.public.remote_mode as i32),
            creation_time: Set(value.public.creation_time),
            updated_at: Set(value.public.updated_at),
        }
    }
}

impl From<Model> for VjudgeNode {
    fn from(model: Model) -> Self {
        let use_mode = model.use_mode.into();
        VjudgeNode {
            node_id: model.node_id,
            public: VjudgeNodePublic {
                iden: model.user_iden,
                platform: model.platform,
                verified_code: model.verified_code,
                verified: model.verified,
                creation_time: model.creation_time,
                updated_at: model.updated_at,
                remote_mode: use_mode,
            },
            private: VjudgeNodePrivate {
                auth: match model.auth {
                    Some(a) if a.starts_with("p_") => {
                        Some(VjudgeAuth::Password(a[2..].to_string()))
                    }
                    Some(a) if a.starts_with("t_") => {
                        Some(VjudgeAuth::Token(a[2..].to_string()))
                    }
                    _ => None,
                },
            },
        }
    }
}

use crate::db::entity::node::user_remote::{ActiveModel, Column, Entity, Model};
use crate::graph::node::{Node, NodeRaw};
use chrono::NaiveDateTime;
use macro_node_iden::{Node, NodeRaw};
use sea_orm::EntityTrait;
use serde::{Deserialize, Serialize};
