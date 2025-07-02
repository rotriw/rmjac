use crate::db::entity::edge::{DbEdgeActiveModel, DbEdgeEntityModel, DbEdgeInfo};
use crate::graph::edge::problem_tag::ProblemTagEdge;
use sea_orm::entity::prelude::*;
use sea_orm::{DeriveEntityModel, DeriveRelation, EnumIter};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "edge_problem_tag")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub edge_id: i64,
    pub u_node_id: i64,
    pub v_node_id: i64,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
impl DbEdgeActiveModel<Model, ProblemTagEdge> for ActiveModel {}
impl DbEdgeInfo for ActiveModel {
    fn get_edge_type(&self) -> &str {
        "problem_tag"
    }
}

impl From<Model> for ProblemTagEdge {
    fn from(model: Model) -> Self {
        ProblemTagEdge {
            id: model.edge_id,
            u: model.u_node_id,
            v: model.v_node_id,
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
