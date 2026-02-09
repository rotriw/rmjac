#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub enum VjudgeAuth {
    Password(String),
    Token(String),
}

#[derive(Deserialize, Serialize, Debug, Clone, PartialEq, EnumIter)]
pub enum RemoteMode {
    OnlyTrust = 0,
    Apikey = 1,
    Token = 2,
    Password = 3,
}

impl From<String> for RemoteMode {
    fn from(value: String) -> Self {
        match value.as_str() {
            "only" => RemoteMode::OnlyTrust,
            "apikey" => RemoteMode::Apikey,
            "password" => RemoteMode::Password,
            "token" => RemoteMode::Token,
            _ => RemoteMode::Apikey,
        }
    }
}

impl From<RemoteMode> for String {
    fn from(value: RemoteMode) -> Self {
        match value {
            RemoteMode::OnlyTrust => "only".to_string(),
            RemoteMode::Apikey => "apikey".to_string(),
            RemoteMode::Password => "password".to_string(),
            RemoteMode::Token => "token".to_string(),
        }
    }
}

impl From<i32> for RemoteMode {
    fn from(value: i32) -> Self {
        match value {
            0 => RemoteMode::OnlyTrust,
            1 => RemoteMode::Apikey,
            2 => RemoteMode::Token,
            3 => RemoteMode::Password,
            _ => RemoteMode::Apikey,
        }
    }
}

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub struct VjudgeNodePublic {
    pub platform: String,
    pub verified_code: String,
    pub verified: bool,
    pub iden: String,
    #[ts(type = "string")]
    pub creation_time: NaiveDateTime,
    #[ts(type = "string")]
    pub updated_at: NaiveDateTime,
    #[ts(type = "string")]
    pub remote_mode: RemoteMode,
}

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub struct VjudgeNodePrivate {
    pub auth: Option<VjudgeAuth>,
}

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub struct VjudgeNodePublicRaw {
    pub platform: String,
    pub verified_code: String,
    pub verified: bool,
    pub iden: String,
    #[ts(type = "string")]
    pub creation_time: NaiveDateTime,
    #[ts(type = "string")]
    pub updated_at: NaiveDateTime,
    #[ts(type = "string")]
    pub remote_mode: RemoteMode,
}

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub struct VjudgeNodePrivateRaw {
    pub auth: Option<VjudgeAuth>,
}

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS, Node)]
#[ts(export)]
pub struct VjudgeNode {
    pub node_id: i64,
    pub public: VjudgeNodePublic,
    pub private: VjudgeNodePrivate,
}

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS, NodeRaw)]
#[ts(export)]
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
                    Some(a) if a.starts_with("t_") => Some(VjudgeAuth::Token(a[2..].to_string())),
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
use sea_orm::{EntityTrait, EnumIter};
use serde::{Deserialize, Serialize};
use strum_macros::EnumCount;
