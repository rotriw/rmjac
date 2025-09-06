use crate::db::entity::node::{DbNodeActiveModel, DbNodeInfo};
use crate::graph::node::training::problem::TrainingProblemNode;
use sea_orm::entity::prelude::*;
use sea_orm::{DeriveEntityModel, DeriveRelation, EnumIter, FromJsonQueryResult};
use serde::{Deserialize, Serialize};

#[derive(
    Clone, Debug, PartialEq, DeriveEntityModel, Deserialize, Serialize, FromJsonQueryResult,
)]
#[sea_orm(table_name = "node_training_problem")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub node_id: i64,
    pub description: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

impl DbNodeInfo for ActiveModel {
    fn get_node_type(&self) -> &str {
        "training"
    }
}
impl DbNodeActiveModel<Model, TrainingProblemNode> for ActiveModel {}
