use crate::db::entity::node::{DbNodeActiveModel, DbNodeInfo};
use crate::error::CoreError;
use crate::graph::node::perm_group::{PermGroupNode, PermGroupNodePrivate, PermGroupNodePublic};
use sea_orm::entity::prelude::*;
use sea_orm::{DeriveEntityModel, DeriveRelation, EnumIter, FromJsonQueryResult};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, FromJsonQueryResult)]
pub struct ContentType {
    pub iden: String,
    pub content: String,
}
#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "node_perm_group")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub node_id: i64,
    pub iden: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

impl DbNodeInfo for ActiveModel {
    fn get_node_type(&self) -> &str {
        "perm_group"
    }
}
impl DbNodeActiveModel<Model, PermGroupNode> for ActiveModel {}

impl From<Model> for PermGroupNode {
    fn from(model: Model) -> Self {
        PermGroupNode {
            node_id: model.node_id,
            public: PermGroupNodePublic {},
            private: PermGroupNodePrivate {
                name: model.iden.clone(),
            },
        }
    }
}

pub async fn get_default_strategy_node(db: &DatabaseConnection) -> Result<i64, CoreError> {
    use sea_orm::EntityTrait;
    let node = Entity::find()
        .filter(Column::Iden.eq("default"))
        .one(db)
        .await?
        .ok_or(CoreError::NotFound(
            "Default strategy node not found".to_string(),
        ))?;
    Ok(node.node_id)
}
