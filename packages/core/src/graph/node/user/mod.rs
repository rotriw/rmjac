use chrono::NaiveDateTime;
use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};
use tap::Conv;

use crate::Result;
use crate::{db, graph::node::Node};

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct UserNodePublic {
    pub name: String,
    pub email: String,
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

impl<'a> Node<'a> for UserNode {
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

    fn get_outdegree(&self, db: &DatabaseConnection) -> Result<i64> {
        Ok(1)
    }
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct UserNode {
    pub node_id: i64,
    pub node_iden: String,
    pub public: UserNodePublic,
    pub private: UserNodePrivate,
}

impl From<db::entity::node::user::Model> for UserNode {
    fn from(model: db::entity::node::user::Model) -> Self {
        UserNode {
            node_id: model.node_id,
            node_iden: model.user_iden,
            public: UserNodePublic {
                name: model.user_name,
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
