use crate::db::entity::node::{DbNodeActiveModel, DbNodeInfo};
use crate::graph::node::problem::statement::ProblemStatementNode;
use sea_orm::entity::prelude::*;
use sea_orm::{DeriveEntityModel, DeriveRelation, EnumIter, FromJsonQueryResult};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, FromJsonQueryResult)]
pub struct ContentType {
    pub iden: String,
    pub content: String,
}
#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "node_problem_statement")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub node_id: i64,
    pub iden: String,
    pub source: String,
    pub content: Vec<ContentType>,
    pub creation_time: DateTime,
    pub update_time: DateTime,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

impl DbNodeInfo for ActiveModel {
    fn get_node_type(&self) -> &str {
        "problem_statement"
    }
}
impl DbNodeActiveModel<Model, ProblemStatementNode> for ActiveModel {}
