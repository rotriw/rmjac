use crate::db::entity::node::{DbNodeActiveModel, DbNodeInfo};
use crate::graph::node::training::TrainingNode;
use sea_orm::entity::prelude::*;
use sea_orm::{DeriveEntityModel, DeriveRelation, EnumIter, FromJsonQueryResult};
use serde::{Deserialize, Serialize};

#[derive(
    Clone, Debug, PartialEq, DeriveEntityModel, Deserialize, Serialize, FromJsonQueryResult,
)]
#[sea_orm(table_name = "node_training")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub node_id: i64,
    pub name: String,
    pub iden: String,
    pub description_public: String,
    pub description_private: String,
    pub start_time: DateTime,
    pub end_time: DateTime,
    pub training_type: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

impl DbNodeInfo for ActiveModel {
    fn get_node_type(&self) -> &str {
        "training"
    }
}
impl DbNodeActiveModel<Model, TrainingNode> for ActiveModel {}
