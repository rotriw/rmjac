use crate::db::entity::node::{DbNodeActiveModel, DbNodeInfo};
use crate::graph::node::record::submit_info::SubmitInfoNode;
use sea_orm::entity::prelude::*;
use sea_orm::{DeriveEntityModel, DeriveRelation, EnumIter};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "node_submit_info")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub node_id: i64,
    pub option_data: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

impl DbNodeInfo for ActiveModel {
    fn get_node_type(&self) -> &str {
        "submit_info"
    }
}
impl DbNodeActiveModel<Model, SubmitInfoNode> for ActiveModel {}
