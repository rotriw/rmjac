use sea_orm::entity::prelude::*;
use sea_orm::{DeriveEntityModel, DeriveRelation, EnumIter};
use serde::{Deserialize, Serialize};
use crate::model::event::ContestType;
use crate::model::judge::JudgeInfo;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, ts_rs::TS, Serialize, Deserialize)]
#[sea_orm(table_name = "edge_search")]
#[ts(export)]
pub struct Model {
    #[sea_orm(primary_key)]
    pub edge_id: i64,
    pub difficulty: Option<i64>,
    pub content: String,
    pub id: i64,
    pub name: String,
    pub iden: String,
    pub typed: String,
    pub platform: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}