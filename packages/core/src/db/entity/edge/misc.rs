use sea_orm::entity::prelude::*;
use sea_orm::{DeriveEntityModel, DeriveRelation, EnumIter};
use macro_db_init::{table_create};
use crate::db::EntityServer;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "edge_misc")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub edge_id: i64,
    pub from: i64,
    pub to: i64,
    pub edge_type: i64,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}