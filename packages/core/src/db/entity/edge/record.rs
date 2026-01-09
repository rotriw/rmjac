use crate::db::entity::edge::{DbEdgeActiveModel, DbEdgeEntityModel, DbEdgeInfo};
use crate::graph::edge::record::RecordEdge;
use sea_orm::entity::prelude::*;
use sea_orm::{DeriveEntityModel, DeriveRelation, EnumIter};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "edge_record")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub edge_id: i64,
    pub u_node_id: i64,
    pub v_node_id: i64,
    pub record_node_id: i64,
    pub record_status: i64,
    pub code_length: i64,
    pub score: i64,
    pub submit_time: chrono::NaiveDateTime,
    pub platform: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

impl DbEdgeActiveModel<Model, RecordEdge> for ActiveModel {}
impl DbEdgeInfo for ActiveModel {
    fn get_edge_type(&self) -> &str {
        "record"
    }
}

impl From<Model> for RecordEdge {
    fn from(model: Model) -> Self {
        RecordEdge {
            id: model.edge_id,
            u: model.u_node_id,
            v: model.v_node_id,
            record_node_id: model.record_node_id,
            record_status: model.record_status.into(),
            code_length: model.code_length,
            score: model.score,
            submit_time: model.submit_time,
            platform: model.platform,
        }
    }
}

impl DbEdgeEntityModel<Model> for Entity {
    fn get_u_edge_id_column(&self) -> <Self as EntityTrait>::Column {
        Column::UNodeId
    }

    fn get_v_edge_id_column(&self) -> <Self as EntityTrait>::Column {
        Column::VNodeId
    }
}
