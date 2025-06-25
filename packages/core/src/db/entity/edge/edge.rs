use sea_orm::entity::prelude::*;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{DeriveEntityModel, DeriveRelation, EnumIter};

use crate::error::CoreError;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "edge")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub edge_id: i64,
    pub edge_type: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

pub async fn create_edge(db: &DatabaseConnection, edge_type: &str) -> Result<Model, CoreError> {
    let edge = ActiveModel {
        edge_id: NotSet,
        edge_type: Set(edge_type.to_string()),
    };
    Ok(edge.insert(db).await?)
}
