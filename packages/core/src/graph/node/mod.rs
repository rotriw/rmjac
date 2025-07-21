pub mod group;
pub mod iden;
pub mod pages;
pub mod perm_group;
pub mod problem;
pub mod problem_source;
pub mod token;
pub mod user;

use crate::{
    db::entity::node::{node::create_node, DbNodeActiveModel, DbNodeInfo},
    error::CoreError,
    Result,
};
use sea_orm::sea_query::IntoCondition;
use sea_orm::{
    ActiveModelBehavior, ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait,
    IntoActiveModel,
};
use std::fmt::Debug;
use std::str::FromStr;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NodeType {
    User,
    Token,
    Problem,
    Group,
    PermGroup,
}

impl From<NodeType> for &str {
    fn from(node_type: NodeType) -> Self {
        match node_type {
            NodeType::User => "user",
            NodeType::Token => "token",
            NodeType::Problem => "problem",
            NodeType::Group => "group",
            NodeType::PermGroup => "perm_group",
        }
    }
}

pub trait Node<DbNodeActive, DbModel, DbEntity>
where
    DbNodeActive: DbNodeActiveModel<DbModel, Self>
        + Sized
        + Send
        + Sync
        + ActiveModelTrait
        + ActiveModelBehavior
        + DbNodeInfo,
    DbModel: Into<Self>
        + From<<<DbNodeActive as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Model>,
    <DbNodeActive::Entity as EntityTrait>::Model: IntoActiveModel<DbNodeActive>,
    Self: Sized + Send + Sync + Clone,
    DbEntity: EntityTrait,
    <DbEntity as sea_orm::EntityTrait>::Model: Into<DbModel>,
{
    fn get_node_id(&self) -> i64;

    fn get_node_id_column() -> <DbNodeActive::Entity as EntityTrait>::Column {
        <DbNodeActive::Entity as EntityTrait>::Column::from_str("node_id")
            .ok()
            .unwrap()
    }

    fn from_db(
        db: &DatabaseConnection,
        node_id: i64,
    ) -> impl std::future::Future<Output = Result<Self>>
    where
        Self: Sized,
    {
        async move {
            use tap::Conv;
            let node_id_column = Self::get_node_id_column();
            use sea_orm::ColumnTrait;
            use sea_orm::QueryFilter;
            let model = DbEntity::find()
                .filter(node_id_column.eq(node_id))
                .one(db)
                .await?
                .ok_or_else(|| {
                    CoreError::NotFound(format!("Node with id {node_id} not found"))
                })?;
            Ok(model.conv::<DbModel>().into())
        }
    }

    fn from_db_filter<F: IntoCondition>(
        db: &DatabaseConnection,
        filter: F,
    ) -> impl std::future::Future<Output = Result<Vec<Self>>>
    where
        Self: Sized,
    {
        async move {
            use sea_orm::QueryFilter;
            use tap::Conv;
            let models = DbEntity::find().filter(filter).all(db).await?;
            Ok(models
                .into_iter()
                .map(|model| model.conv::<DbModel>().into())
                .collect())
        }
    }

    fn modify<T: Into<sea_orm::Value> + Debug>(
        &self,
        db: &DatabaseConnection,
        column: <DbNodeActive::Entity as EntityTrait>::Column,
        data: T,
    ) -> impl std::future::Future<Output = Result<Self>> {
        async move {
            use tap::Conv;
            let mut new_model = DbNodeActive::new();
            log::trace!(
                "Modifying node {}: setting {} to {:?}",
                self.get_node_id(),
                column.enum_type_name().unwrap_or("unknown"),
                data
            );
            new_model.set(column, data.into());
            let data = new_model.update(db).await?.conv::<DbModel>();
            Ok(data.into())
        }
    }
}

pub trait NodeRaw<Node, DbModel, DbNodeActive>
where
    Self: Into<DbNodeActive> + Clone,
    DbModel: Into<Node>
        + From<<<DbNodeActive as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Model>,
    DbNodeActive: DbNodeActiveModel<DbModel, Node>
        + Sized
        + Send
        + Sync
        + ActiveModelTrait
        + ActiveModelBehavior
        + DbNodeInfo,
    <DbNodeActive::Entity as EntityTrait>::Model: IntoActiveModel<DbNodeActive>,
{
    fn get_node_type(&self) -> &str;
    fn get_node_id_column(&self) -> <DbNodeActive::Entity as EntityTrait>::Column;
    fn save(&self, db: &DatabaseConnection) -> impl std::future::Future<Output = Result<Node>> {
        async {
            use tap::Conv;
            let node_type = self.get_node_type();
            let node_id = create_node(db, node_type).await?.node_id;
            let mut value = (*self).clone().conv::<DbNodeActive>();
            value.set(self.get_node_id_column(), node_id.into());
            Ok(value.save_into_db(db).await?.into())
        }
    }
}
