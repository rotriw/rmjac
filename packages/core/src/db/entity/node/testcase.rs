use crate::db::entity::node::{DbNodeActiveModel, DbNodeInfo};
use sea_orm::entity::prelude::*;
use sea_orm::{DeriveEntityModel, DeriveRelation, EnumIter};
use crate::graph::node::record::testcase::TestcaseNode;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "node_testcase")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub node_id: i64,
    pub time_limit: i64,
    pub memory_limit: i64,
    pub in_file: i64,
    pub out_file: i64,
    pub io_method: String,
    pub diff_method: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

impl DbNodeInfo for ActiveModel {
    fn get_node_type(&self) -> &str {
        "record"
    }
}
impl DbNodeActiveModel<Model, TestcaseNode> for ActiveModel {}
