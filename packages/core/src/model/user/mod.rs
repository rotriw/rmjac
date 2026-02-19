use chrono::DateTime;
use serde::{Deserialize, Serialize};
use crate::service::save::Savable;
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct User {
    pub iden: String,
    pub name: String,
    pub description: String,
    pub password: String,
    pub email: String,
    pub avatar: String,
    pub creation_time: DateTime<chrono::Utc>,
}


#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Token {
    pub token: String,
    pub user_iden: String,
    pub user_id: i64,
}


impl Savable for User {}
impl Savable for Token {}