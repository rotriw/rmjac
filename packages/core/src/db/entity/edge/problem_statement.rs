use crate::db::entity::edge::{DbEdgeActiveModel, DbEdgeEntityModel, DbEdgeInfo};
use crate::graph::edge::perm_manage::PermManageEdge;
use crate::graph::edge::problem_statement::ProblemStatementEdge;
use sea_orm::entity::prelude::*;
use sea_orm::{DeriveEntityModel, DeriveRelation, EnumIter};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "edge_problem_statement")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub edge_id: i64,
    pub u_node_id: i64,
    pub v_node_id: i64,
    pub copyright_risk: i64,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

impl DbEdgeActiveModel<Model, ProblemStatementEdge> for ActiveModel {}
impl DbEdgeInfo for ActiveModel {
    fn get_edge_type(&self) -> &str {
        "problem_statement"
    }
}

impl From<Model> for ProblemStatementEdge {
    fn from(model: Model) -> Self {
        ProblemStatementEdge {
            id: model.edge_id,
            u: model.u_node_id,
            v: model.v_node_id,
            copyright_risk: model.copyright_risk,
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