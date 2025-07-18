use crate::db::entity::node::{DbNodeActiveModel, DbNodeInfo};
use crate::graph::node::problem::tag::ProblemTagNode;
use sea_orm::entity::prelude::*;
use sea_orm::{DeriveEntityModel, DeriveRelation, EnumIter};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "node_problem_tag")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub node_id: i64,
    pub tag_name: String,
    pub tag_description: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

impl DbNodeInfo for ActiveModel {
    fn get_node_type(&self) -> &str {
        "problem_tag"
    }
}
impl DbNodeActiveModel<Model, ProblemTagNode> for ActiveModel {}
