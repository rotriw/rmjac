use crate::db::entity::node::node::create_node;
use crate::error::CoreError;
use sea_orm::entity::prelude::*;
use sea_orm::ActiveValue::Set;
use sea_orm::{DeriveEntityModel, DeriveRelation, EnumIter, FromJsonQueryResult};
use serde::{Deserialize, Serialize};

#[derive(
    Clone, Debug, PartialEq, DeriveEntityModel, Deserialize, Serialize, FromJsonQueryResult,
)]
#[sea_orm(table_name = "node_problem")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub node_id: i64,
    pub node_iden: String,
    pub name: String,
    pub content_public: String,
    pub content_private: String,
    pub creation_time: DateTime,
    pub creation_order: i64,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

pub async fn create_problem_node(
    db: &DatabaseConnection,
    node_id: Option<i64>,
    node_iden: &str,
    name: &str,
    content_public: String,
    content_private: String,
) -> Result<Model, CoreError> {
    let node_iden = format!("problem_{}", node_iden);
    let node_id = match node_id {
        Some(id) => id,
        None => {
            create_node(db, node_iden.as_str(), "problem")
                .await?
                .node_id
        }
    };
    let model = ActiveModel {
        node_id: Set(node_id),
        node_iden: Set(node_iden),
        content_public: Set(content_public),
        content_private: Set(content_private),
        creation_time: Set(chrono::Utc::now().naive_utc()),
        creation_order: Set(0),
        name: Set(name.to_string()),
    };
    let res = model.insert(db).await?;
    Ok(res)
}

pub async fn get_problem_by_nodeid(
    db: &DatabaseConnection,
    node_id: i64,
) -> Result<Model, CoreError> {
    use sea_orm::EntityTrait;
    let problem = Entity::find_by_id(node_id).one(db).await?;
    match problem {
        Some(problem) => Ok(problem),
        None => Err(CoreError::NotFound(format!(
            "Problem with node_id {} not found",
            node_id
        ))),
    }
}
