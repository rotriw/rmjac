use crate::db::entity::node::{DbNodeActiveModel, DbNodeInfo};
use crate::graph::node::record::RecordNode;
use chrono::NaiveDateTime;
use sea_orm::entity::prelude::*;
use sea_orm::{DeriveEntityModel, DeriveRelation, EnumIter};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "node_record")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub node_id: i64,
    pub record_time: NaiveDateTime,
    pub record_update_time: NaiveDateTime,
    pub record_order: i64,
    pub record_status: i64,
    pub record_score: i64,
    pub record_platform: String,
    pub record_url: Option<String>,
    pub statement_id: i64,
    pub record_message: Option<String>,
    pub code: String,
    pub code_language: String,
    pub public_status: bool,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

impl DbNodeInfo for ActiveModel {
    fn get_node_type(&self) -> &str {
        "record"
    }
}
impl DbNodeActiveModel<Model, RecordNode> for ActiveModel {}
