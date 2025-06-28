use crate::db::entity::edge::edge::create_edge;
use crate::db::entity::edge::{DbEdgeActiveModel, DbEdgeEntityModel, DbEdgeInfo};
use crate::error::CoreError;
use crate::graph::edge::perm_manage::PermManageEdge;
use enum_const::EnumConst;
use sea_orm::entity::prelude::*;
use sea_orm::ActiveValue::Set;
use sea_orm::{DeriveEntityModel, DeriveRelation, EnumIter, FromJsonQueryResult};
use serde::{Deserialize, Serialize};
use tap::Conv;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "edge_perm_manage")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub edge_id: i64,
    pub u_node_id: i64,
    pub v_node_id: i64,
    pub perm: i64,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

impl DbEdgeActiveModel<Model, PermManageEdge> for ActiveModel {}
impl DbEdgeInfo for ActiveModel {
    fn get_edge_type(&self) -> &str {
        "perm_manage"
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