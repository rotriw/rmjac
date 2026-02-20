use sea_orm::entity::prelude::*;
use sea_orm::{DeriveEntityModel, DeriveRelation, EnumIter};
#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "edge_problem")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub edge_id: i64,
    pub time_limit: i64,
    pub memory_limit: i64,
    pub difficulty: i64,
    pub platform: String,
    pub iden: String,
    pub name: String,
    pub author_id: i64,
}


#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}