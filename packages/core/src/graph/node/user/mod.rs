#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub struct UserNodePublic {
    pub name: String,
    pub email: String,
    pub iden: String,
    #[ts(type = "string")]
    pub creation_time: NaiveDateTime,
    pub creation_order: i64,
    #[ts(type = "string")]
    pub last_login_time: NaiveDateTime,
    pub avatar: String,
    pub description: String,
    pub bio: String,
    pub profile_show: Vec<String>,
}

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub struct UserNodePrivate {
    pub password: String,
}

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub struct UserNodePublicRaw {
    pub name: String,
    pub email: String,
    pub iden: String,
    #[ts(type = "string")]
    pub creation_time: NaiveDateTime,
    #[ts(type = "string")]
    pub last_login_time: NaiveDateTime,
    pub avatar: String,
}

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub struct UserNodePrivateRaw {
    pub password: String,
}

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS, Node)]
#[ts(export)]
pub struct UserNode {
    pub node_id: i64,
    pub node_iden: String,
    pub public: UserNodePublic,
    pub private: UserNodePrivate,
}

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS, NodeRaw)]
#[ts(export)]
#[node_raw(node_type = "user")]
pub struct UserNodeRaw {
    pub public: UserNodePublicRaw,
    pub private: UserNodePrivateRaw,
}

impl From<UserNodeRaw> for ActiveModel {
    fn from(value: UserNodeRaw) -> Self {
        use sea_orm::ActiveValue::{NotSet, Set};
        Self {
            node_id: NotSet,
            user_name: Set(value.public.name),
            user_email: Set(value.public.email),
            user_password: Set(value.private.password),
            user_avatar: Set(value.public.avatar),
            user_creation_time: Set(chrono::Utc::now().naive_utc()),
            user_creation_order: NotSet,
            user_last_login_time: Set(value.public.last_login_time),
            user_description: NotSet,
            user_iden: Set(value.public.iden),
            user_bio: NotSet,
            user_profile_show: NotSet,
        }
    }
}

impl From<Model> for UserNode {
    fn from(model: Model) -> Self {
        UserNode {
            node_id: model.node_id,
            node_iden: model.user_iden.clone(),
            public: UserNodePublic {
                name: model.user_name,
                iden: model.user_iden,
                email: model.user_email,
                creation_time: model.user_creation_time.and_utc().naive_utc(),
                creation_order: model.user_creation_order,
                last_login_time: model.user_last_login_time.and_utc().naive_utc(),
                avatar: model.user_avatar,
                description: model.user_description.unwrap_or_default(),
                bio: model.user_bio.unwrap_or_default(),
                profile_show: model
                    .user_profile_show
                    .unwrap_or_default()
                    .split(",")
                    .map(|s| s.to_string())
                    .collect(),
            },
            private: UserNodePrivate {
                password: model.user_password,
            },
        }
    }
}

use crate::db::entity::node::user::{ActiveModel, Column, Entity, Model};
use crate::graph::node::{Node, NodeRaw};
use chrono::NaiveDateTime;
use macro_node_iden::{Node, NodeRaw};
use sea_orm::EntityTrait;
use serde::{Deserialize, Serialize};

pub mod remote_account;
