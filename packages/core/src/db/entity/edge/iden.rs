use crate::db::entity::edge::{DbEdgeActiveModel, DbEdgeEntityModel, DbEdgeInfo};
use crate::graph::edge::iden::IdenEdge;
use sea_orm::entity::prelude::*;
use sea_orm::{DeriveEntityModel, DeriveRelation, EnumIter};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "edge_iden")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub edge_id: i64,
    pub u_node_id: i64,
    pub v_node_id: i64,
    pub weight: i64,
    pub iden: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

impl DbEdgeActiveModel<Model, IdenEdge> for ActiveModel {}
impl DbEdgeInfo for ActiveModel {
    fn get_edge_type(&self) -> &str {
        "iden"
    }
}

impl From<Model> for IdenEdge {
    fn from(model: Model) -> Self {
        IdenEdge {
            id: model.edge_id,
            u: model.u_node_id,
            v: model.v_node_id,
            iden: model.iden,
            weight: model.weight,
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
