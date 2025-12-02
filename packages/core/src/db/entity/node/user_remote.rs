use chrono::NaiveDateTime;
use crate::db::entity::node::{DbNodeActiveModel, DbNodeInfo};
use sea_orm::entity::prelude::*;
use sea_orm::{DeriveEntityModel, DeriveRelation, EnumIter};
use crate::graph::node::user::remote_account::UserRemoteAccountNode;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "node_user_remote_account")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub node_id: i64,
    pub user_iden: String,
    pub platform: String,
    pub verified_code: String,
    pub verified: bool,
    pub auth: Option<String>,
    pub use_mode: i32,
    pub creation_time: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

impl DbNodeInfo for ActiveModel {
    fn get_node_type(&self) -> &str {
        "node_user_remote_account"
    }
}

impl DbNodeActiveModel<Model, UserRemoteAccountNode> for ActiveModel {}