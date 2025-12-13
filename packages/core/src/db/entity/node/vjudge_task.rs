use crate::db::entity::node::{DbNodeActiveModel, DbNodeInfo};
use crate::graph::node::vjudge_task::VjudgeTaskNode;
use sea_orm::entity::prelude::*;
use sea_orm::{DeriveEntityModel, DeriveRelation, EnumIter};

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "node_vjudge_task")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub node_id: i64,
    pub status: String,
    #[sea_orm(column_type = "Text")]
    pub log: String,
    pub created_at: DateTime,
    pub updated_at: DateTime,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

impl DbNodeInfo for ActiveModel {
    fn get_node_type(&self) -> &str {
        "vjudge_task"
    }
}

impl DbNodeActiveModel<Model, VjudgeTaskNode> for ActiveModel {}

