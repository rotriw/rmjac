use crate::db::entity::node::{DbNodeActiveModel, DbNodeInfo};
use crate::graph::node::problem::ProblemNode;
use sea_orm::entity::prelude::*;
use sea_orm::{DeriveEntityModel, DeriveRelation, EnumIter, FromJsonQueryResult};
use serde::{Deserialize, Serialize};

#[derive(
    Clone, Debug, PartialEq, DeriveEntityModel, Deserialize, Serialize, FromJsonQueryResult,
)]
#[sea_orm(table_name = "node_problem")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub node_id: i64,
    pub name: String,
    pub content_public: String,
    pub content_private: String,
    pub creation_time: DateTime,
    pub creation_order: i64,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

impl DbNodeInfo for ActiveModel {
    fn get_node_type(&self) -> &str {
        "problem"
    }
}
impl DbNodeActiveModel<Model, ProblemNode> for ActiveModel {}
