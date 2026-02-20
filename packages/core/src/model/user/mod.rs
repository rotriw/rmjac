use chrono::DateTime;
use serde::{Deserialize, Serialize};
use crate::model::content::Description;
use crate::service::save::Savable;
#[derive(Serialize, Deserialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub struct User {
    pub iden: String,
    pub name: String,
    pub description: Description,
    pub password: String,
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


impl Savable for User {}
impl Savable for Token {}