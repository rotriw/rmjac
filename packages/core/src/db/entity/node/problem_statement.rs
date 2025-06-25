use crate::error::CoreError;
use sea_orm::entity::prelude::*;
use sea_orm::ActiveValue::Set;
use sea_orm::{DeriveEntityModel, DeriveRelation, EnumIter, FromJsonQueryResult};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, FromJsonQueryResult)]
pub struct ContentType {
    pub iden: String,
    pub content: String,
}
#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "node_problem_statement")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub node_id: i64,
    pub iden: String,
    pub source: String,
    pub content: Vec<ContentType>,
    pub creation_time: DateTime,
    pub update_time: DateTime,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

pub async fn create_problem_statement(
    db: &DatabaseConnection,
    node_id: i64,
    iden: String,
    source: String,
    content: Vec<ContentType>,
) -> Result<Model, CoreError> {
    let model = ActiveModel {
        node_id: Set(node_id),
        iden: Set(iden),
        source: Set(source),
        content: Set(content),
        creation_time: Set(chrono::Utc::now().naive_utc()),
        update_time: Set(chrono::Utc::now().naive_utc()),
    };
    let res = model.insert(db).await?;
    Ok(res)
}
