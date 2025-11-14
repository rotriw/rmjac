use crate::db::entity::node::{DbNodeActiveModel, DbNodeInfo};
use crate::graph::node::pages::{PagesNode, PagesNodePrivate, PagesNodePublic};
use sea_orm::entity::prelude::*;
use sea_orm::{DeriveEntityModel, DeriveRelation, EnumIter, FromJsonQueryResult};
use serde::{Deserialize, Serialize};
use crate::error::CoreError;
use crate::Result;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, FromJsonQueryResult)]
pub struct ContentType {
    pub iden: String,
    pub content: String,
}
#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "node_pages")]
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
        "pages"
    }
}
impl DbNodeActiveModel<Model, PagesNode> for ActiveModel {}

impl From<Model> for PagesNode {
    fn from(model: Model) -> Self {
        PagesNode {
            node_id: model.node_id,
            public: PagesNodePublic {},
            private: PagesNodePrivate {
                name: model.iden.clone(),
            },
        }
    }
}


pub async fn default_system_node(db: &DatabaseConnection) -> Result<i64> {
    let node = Entity::find()
        .filter(Column::Iden.eq("system"))
        .one(db)
        .await?
        .ok_or(CoreError::NotFound(
            "Default system node not found".to_string(),
        ))?;
    Ok(node.node_id)
}