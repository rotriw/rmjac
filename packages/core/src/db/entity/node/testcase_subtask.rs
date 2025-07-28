use crate::db::entity::node::{DbNodeActiveModel, DbNodeInfo};
use crate::graph::node::record::RecordNode;
use crate::graph::node::record::subtask::SubtaskNode;
use chrono::{NaiveDate, NaiveDateTime};
use sea_orm::entity::prelude::*;
use sea_orm::{DeriveEntityModel, DeriveRelation, EnumIter};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "node_testcase_subtask")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub node_id: i64,
    pub subtask_id: i32,
    pub time_limit: i64,
    pub memory_limit: i64,
    pub subtask_calc_method: i32,
    pub subtask_calc_function: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

impl DbNodeInfo for ActiveModel {
    fn get_node_type(&self) -> &str {
        "testcase_subtask"
    }
}
impl DbNodeActiveModel<Model, SubtaskNode> for ActiveModel {}
