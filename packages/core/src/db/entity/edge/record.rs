use chrono::NaiveDateTime;
use sea_orm::entity::prelude::*;
use sea_orm::{DeriveEntityModel, DeriveRelation, EnumIter};
use crate::model::record::JudgeStatus;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "edge_record")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub edge_id: i64,
    pub time: i64,
    pub memory: i64,
    pub user_id: i64,
    pub problem_id: i64,
    pub code: String,
    pub record_id: i64,
    pub status: JudgeStatus,
    pub language: String,
    pub score: f64,
}


#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}