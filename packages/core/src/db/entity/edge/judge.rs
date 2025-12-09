use crate::db::entity::edge::{DbEdgeActiveModel, DbEdgeEntityModel, DbEdgeInfo};
use crate::graph::edge::judge::JudgeEdge;
use sea_orm::entity::prelude::*;
use sea_orm::{DeriveEntityModel, DeriveRelation, EnumIter};
use crate::graph::node::record::RecordStatus;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "edge_judge")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub edge_id: i64,
    pub u_node_id: i64,
    pub v_node_id: i64,
    pub status: String,
    pub score: i64,
    pub time: i64,
    pub memory: i64,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

impl DbEdgeActiveModel<Model, JudgeEdge> for ActiveModel {}
impl DbEdgeInfo for ActiveModel {
    fn get_edge_type(&self) -> &str {
        "judge"
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
