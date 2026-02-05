#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
#[repr(i64)]
pub enum TrainingStatus {
    Invited = 1,
    Joined = 2,
    Completed = 3,
    Pin = 4,
    Owned = 5,
    Unknown = -1,
}

impl From<String> for TrainingStatus {
    fn from(value: String) -> Self {
        match value.as_str() {
            "invited" => TrainingStatus::Invited,
            "joined" => TrainingStatus::Joined,
            "completed" => TrainingStatus::Completed,
            "pin" => TrainingStatus::Pin,
            "owned" => TrainingStatus::Owned,
            _ => TrainingStatus::Unknown,
        }
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct TrainingUserEdge {
    pub id: i64,
    pub u: i64,
    pub v: i64,
    pub status: TrainingStatus,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct TrainingUserEdgeRaw {
    pub u: i64,
    pub v: i64,
    pub status: TrainingStatus,
}

impl EdgeRaw<TrainingUserEdge, Model, ActiveModel> for TrainingUserEdgeRaw {
    fn get_edge_type(&self) -> &str {
        "training_user"
    }
    fn get_edge_id_column(
        &self,
    ) -> <<ActiveModel as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Column {
        Column::EdgeId
    }

    fn get_u_node_id(&self) -> i64 {
        self.u
    }

    fn get_v_node_id(&self) -> i64 {
        self.v
    }
}

impl From<TrainingUserEdgeRaw> for ActiveModel {
    fn from(raw: TrainingUserEdgeRaw) -> Self {
        ActiveModel {
            edge_id: NotSet,
            u_node_id: Set(raw.u),
            v_node_id: Set(raw.v),
            status: Set(raw.status as i64),
        }
    }
}

impl From<i64> for TrainingStatus {
    fn from(value: i64) -> Self {
        match value {
            1 => TrainingStatus::Invited,
            2 => TrainingStatus::Joined,
            3 => TrainingStatus::Completed,
            4 => TrainingStatus::Pin,
            5 => TrainingStatus::Owned,
            _ => panic!("Invalid value for TrainingStatus: {}", value),
        }
    }
}

impl From<Model> for TrainingUserEdge {
    fn from(value: Model) -> Self {
        Self {
            id: value.edge_id,
            u: value.u_node_id,
            v: value.v_node_id,
            status: value.status.into()
        }
    }
}

impl Edge<ActiveModel, Model, Entity> for TrainingUserEdge {
    fn get_edge_id(&self) -> i64 {
        self.id
    }
    fn get_u_node_id(&self) -> i64 {
        self.u
    }
    fn get_v_node_id(&self) -> i64 {
        self.v
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct TrainingUserEdgeQuery;

impl EdgeQuery<ActiveModel, Model, Entity, TrainingUserEdge> for TrainingUserEdgeQuery {
    fn get_edge_type() -> &'static str {
        "training_user"
    }
}

use crate::{
    db::entity::edge::training_user::{ActiveModel, Column, Entity, Model},
    graph::edge::{Edge, EdgeQuery, EdgeRaw},
};
use sea_orm::ActiveValue::{NotSet, Set};
use serde::{Deserialize, Serialize};
