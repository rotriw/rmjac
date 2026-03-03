use crate::model::content::Description;
use crate::service::save::Savable;
use chrono::DateTime;
use serde::{Deserialize, Serialize};
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct User {
    pub iden: String,
    pub name: String,
    pub description: Description,
    pub password: String,
    pub email: String,
    pub avatar: String,
    pub creation_time: DateTime<chrono::Utc>,
}

// this user is safe, exclude password.
#[derive(Serialize, Deserialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub struct DisplayUser {
    pub iden: String,
    pub name: String,
    pub description: Description,
    pub email: String,
    pub avatar: String,
    #[ts(type = "string")]
    pub creation_time: DateTime<chrono::Utc>,
}

#[derive(Serialize, Deserialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub struct Token {
    pub token: String,
    pub user_iden: String,
    pub user_id: i64,
}

impl From<User> for DisplayUser {
    fn from(value: User) -> Self {
        Self {
            iden: value.iden,
            name: value.name,
            description: value.description,
            email: value.email,
            avatar: value.avatar,
            creation_time: value.creation_time,
        }
    }
}

impl Savable for User {}
impl Savable for Token {}
