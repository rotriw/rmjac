use sea_orm::entity::prelude::*;
use sea_orm::{DeriveEntityModel, DeriveRelation, EnumIter};
use crate::model::judge::JudgeInfo;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "edge_event_problem")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub edge_id: i64,
    pub event_id: i64,
    pub problem_id: i64,
    pub iden: String,
}


#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}