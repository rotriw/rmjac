use crate::model::event::ContestType;
use crate::model::judge::JudgeInfo;
use sea_orm::entity::prelude::*;
use sea_orm::{DeriveEntityModel, DeriveRelation, EnumIter};
use serde::{Deserialize, Serialize};
use crate::model::content::Description;
use crate::model::record::Record;

#[derive(Clone, Debug, ts_rs::TS, Serialize, Deserialize)]
#[ts(export)]
pub enum TrainingStatus {
    Owned = 1,
    Joined = 2,
    Manage = 3,
}

#[derive(Clone, Debug, ts_rs::TS, Serialize, Deserialize)]
#[ts(export)]
pub enum OwnedData {
    Problem {
        status: String, // TODO: enum? OWNER / CONTRIBUTOR / ... HIDE.
    },
    TODO {
        status: TrainingStatus,
    },
    // Badge {
    //     badge_id: i64,
    // }
}

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, ts_rs::TS, Serialize, Deserialize)]
#[sea_orm(table_name = "edge_user_show")]
#[ts(export)]
pub struct Model {
    #[sea_orm(primary_key)]
    pub edge_id: i64,
    pub user_id: i64,
    pub task_id: i64,
    pub data: String, // json.
    pub order: i64,
    pub description: Option<String>,
    pub public_hide: bool,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
