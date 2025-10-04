use crate::db::entity::node::{DbNodeActiveModel, DbNodeInfo};
use crate::graph::node::iden::IdenNode;
use sea_orm::entity::prelude::*;
use sea_orm::{DeriveEntityModel, DeriveRelation, EnumIter, FromJsonQueryResult};
use serde::{Deserialize, Serialize};
use crate::error::CoreError;

#[derive(
    Clone, Debug, PartialEq, DeriveEntityModel, Deserialize, Serialize, FromJsonQueryResult,
)]
#[sea_orm(table_name = "node_iden")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub node_id: i64,
    pub iden: String,
    pub weight: i64,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

impl DbNodeInfo for ActiveModel {
    fn get_node_type(&self) -> &str {
        "iden"
    }
}
impl DbNodeActiveModel<Model, IdenNode> for ActiveModel {}

pub async fn default_iden_node(db: &DatabaseConnection) -> Result<i64, CoreError> {
    let node = Entity::find()
        .filter(Column::Weight.eq(-191919))
        .one(db)
        .await?
        .ok_or(CoreError::NotFound(
            "Default iden super node not found".to_string(),
        ))?;
    Ok(node.node_id)
}
