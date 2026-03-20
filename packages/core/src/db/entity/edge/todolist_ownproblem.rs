use crate::model::event::ContestType;
use crate::model::judge::JudgeInfo;
use sea_orm::entity::prelude::*;
use sea_orm::{DeriveEntityModel, DeriveRelation, EnumIter};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, ts_rs::TS, Serialize, Deserialize)]
#[sea_orm(table_name = "edge_todo_list")]
#[ts(export)]
pub struct Model {
    #[sea_orm(primary_key)]
    pub edge_id: i64,
    pub order: i64,
    pub todo_list_id: i64,
    pub problem_id: i64,
    pub description: String,
    pub problem_iden: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
