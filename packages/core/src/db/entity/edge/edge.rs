use sea_orm::entity::prelude::*;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{DeriveEntityModel, DeriveRelation, EnumIter};

use crate::error::CoreError;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "edge_perm_view")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub perm_id: i64,
    pub u_node_id: i64,
    pub v_node_id: i64,
    pub edge_type: String,
}


#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

pub async fn create_edge(db: &DatabaseConnection, edge_type: &str, u_id: i64, v_id: i64) -> Result<Model, CoreError> {
    let edge = ActiveModel {
        perm_id: NotSet,
        u_node_id: Set(u_id),
        v_node_id: Set(v_id),
        edge_type: Set(edge_type.to_string()),
    };
    Ok(edge.insert(db).await?)
}