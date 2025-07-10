use sea_orm::entity::prelude::*;
use sea_orm::{DeriveEntityModel, DeriveRelation, EnumIter};

use crate::error::CoreError;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "node")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub node_id: i64,
    pub node_type: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

pub async fn create_node(
    db: &DatabaseConnection,
    node_type: &str,
) -> Result<Model, CoreError> {
    use sea_orm::ActiveValue::{NotSet, Set};
    let new_node = ActiveModel {
        node_id: NotSet,
        node_type: Set(node_type.to_string()),
    };
    Ok(new_node.insert(db).await?)
}
