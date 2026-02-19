use sea_orm::{ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityName, EntityTrait, ModelTrait, QueryFilter, Value};
use sea_orm::sqlx::Connection;
use crate::db::entity::edge::user::Entity;
use crate::error::CoreError;
use crate::Result;
// impl some default method.


pub trait ExistsCheck {
    type CheckColumn;
    fn exists<V: Into<Value>>(db: &DatabaseConnection, c: Self::CheckColumn, v: V) -> impl Future<Output = Result<bool>>;
    fn exists_for_str<V: Into<Value>>(db: &DatabaseConnection, c: &str, v: V) -> impl Future<Output = Result<bool>>;
}

impl<Entity, Model, ActiveModel, Column> ExistsCheck for Model where
    Model: ModelTrait<Entity = Entity>,
    Entity: EntityTrait<Column = Column, Model = Model, ActiveModel = ActiveModel> + EntityName,
    ActiveModel: ActiveModelTrait<Entity = Entity>,
    Column: ColumnTrait<EntityName = Entity> {
    type CheckColumn = Column;

    async fn exists<V: Into<Value>>(db: &DatabaseConnection, c: Column, v: V) -> Result<bool> {
        let entity = Entity::find().filter(c.eq(v)).one(db).await?;
        Ok(entity.is_some())
    }

    async fn exists_for_str<V: Into<Value>>(db: &DatabaseConnection, c: &str, v: V) -> Result<bool> {
        let column = Column::from_str(c).map_err(|_| CoreError::NotFound(c.to_string()))?;
        Self::exists(db, column, v).await
    }
}

pub mod misc;
pub use misc::*;