use crate::db::entity::node::{DbNodeActiveModel, DbNodeInfo};
use crate::graph::node::problem::limit::ProblemLimitNode;
use sea_orm::entity::prelude::*;
use sea_orm::{DeriveEntityModel, DeriveRelation, EnumIter};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "node_problem_limit")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub node_id: i64,
    pub time_limit: i64,
    pub memory_limit: i64,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

impl DbNodeInfo for ActiveModel {
    fn get_node_type(&self) -> &str {
        "problem_limit"
    }
}
impl DbNodeActiveModel<Model, ProblemLimitNode> for ActiveModel {}
