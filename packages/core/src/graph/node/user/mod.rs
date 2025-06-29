use chrono::NaiveDateTime;
use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};
use tap::Conv;

use crate::graph::node::NodeRaw;
use crate::Result;
use crate::{db, graph::node::Node};

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct UserNodePublic {
    pub name: String,
    pub email: String,
    pub iden: String,
    pub creation_time: NaiveDateTime,
    pub creation_order: i64,
    pub last_login_time: NaiveDateTime,
    pub avatar: String,
    pub description: String,
    pub bio: String,
    pub profile_show: Vec<String>,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct UserNodePrivate {
    pub password: String,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct UserNodePublicRaw {
    pub name: String,
    pub email: String,
    pub iden: String,
    pub creation_time: NaiveDateTime,
    pub last_login_time: NaiveDateTime,
    pub avatar: String,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct UserNodePrivateRaw {
    pub password: String,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct UserNode {
    pub node_id: i64,
    pub node_iden: String,
    pub public: UserNodePublic,
    pub private: UserNodePrivate,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct UserNodeRaw {
    pub public: UserNodePublicRaw,
    pub private: UserNodePrivateRaw,
}

impl From<UserNodeRaw> for db::entity::node::user::ActiveModel {
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

impl Node for UserNode {
    fn get_node_id(&self) -> i64 {
        self.node_id
    }

    fn get_node_iden(&self) -> String {
        self.node_iden.clone()
    }

    async fn from_db(db: &DatabaseConnection, node_id: i64) -> Result<Self>
    where
        Self: Sized,
    {
        let model = db::entity::node::user::get_user_by_nodeid(db, node_id).await?;
        Ok(model.conv::<UserNode>())
    }
}

use crate::db::entity::node::user as user_entity;

impl NodeRaw<UserNode, user_entity::Model, user_entity::ActiveModel> for UserNodeRaw {
    fn get_node_id_column(&self) -> <<user_entity::ActiveModel as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Column{
        user_entity::Column::NodeId
    }

    fn get_node_iden_column(&self) -> <<user_entity::ActiveModel as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Column{
        user_entity::Column::UserIden
    }

    fn get_node_type(&self) -> &str {
        "user"
    }

    fn get_node_iden(&self) -> String {
        format!("user_{}", self.public.iden)
    }
}

impl From<db::entity::node::user::Model> for UserNode {
    fn from(model: db::entity::node::user::Model) -> Self {
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
