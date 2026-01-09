pub mod group;
pub mod iden;
pub mod pages;
pub mod perm_group;
pub mod problem;
pub mod problem_source;
pub mod record;
pub mod token;
pub mod training;
pub mod user;
pub mod vjudge_task;

use crate::{
    Result,
    db::entity::node::{DbNodeActiveModel, DbNodeInfo, node::create_node},
    error::CoreError,
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
    DbModel: Into<Self> + From<<<DbNodeActive as ActiveModelTrait>::Entity as EntityTrait>::Model>,
    <DbNodeActive::Entity as EntityTrait>::Model: IntoActiveModel<DbNodeActive>,
    Self: Sized + Send + Sync + Clone,
    DbEntity: EntityTrait,
    <DbEntity as EntityTrait>::Model: Into<DbModel>,
{
    fn get_node_id(&self) -> i64;

    fn get_node_type() -> &'static str;

    fn get_node_id_column() -> <DbNodeActive::Entity as EntityTrait>::Column {
        <DbNodeActive::Entity as EntityTrait>::Column::from_str("node_id")
            .ok()
            .unwrap()
    }

    fn from_db(db: &DatabaseConnection, node_id: i64) -> impl Future<Output = Result<Self>>
    where
        Self: Sized,
    {
        async move {
            use tap::Conv;
            let node_id_column = Self::get_node_id_column();
            use sea_orm::ColumnTrait;
            use sea_orm::QueryFilter;
            log::trace!("Querying node with id {node_id}");
            let model = DbEntity::find()
                .filter(node_id_column.eq(node_id))
                .one(db)
                .await?
                .ok_or_else(|| {
                    CoreError::NotFound(format!(
                        "Node({}) with id {node_id} not found",
                        Self::get_node_type()
                    ))
                })?;
            Ok(model.conv::<DbModel>().into())
        }
    }

    fn from_db_filter<F: IntoCondition>(
        db: &DatabaseConnection,
        filter: F,
    ) -> impl Future<Output = Result<Vec<Self>>>
    where
        Self: Sized,
    {
        async move {
            use sea_orm::QueryFilter;
            use tap::Conv;
            log::trace!("Querying node with filter");
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
    ) -> impl Future<Output = Result<Self>> {
        async move {
            use tap::Conv;
            let mut new_model = DbNodeActive::new();
            log::debug!(
                "Modifying node {}: setting {} to {:?}",
                self.get_node_id(),
                column.enum_type_name().unwrap_or("unknown"),
                data
            );
            let node_id_column = Self::get_node_id_column();
            new_model.set(node_id_column, self.get_node_id().into());
            new_model.set(column, data.into());
            let data = new_model.update(db).await?.conv::<DbModel>();
            Ok(data.into())
        }
    }

    fn modify_from_active_model(
        &self,
        db: &DatabaseConnection,
        active_model: DbNodeActive,
    ) -> impl Future<Output = Result<Self>> {
        async move {
            use tap::Conv;
            log::debug!(
                "Modifying node {} with active model: {:?}",
                self.get_node_id(),
                active_model
            );
            let data = active_model.update(db).await?.conv::<DbModel>();
            Ok(data.into())
        }
    }

    // Delete the node from the database.
    // Note that you should not to call this function directly, if you want to delete a node,
    // you should delete all the edges connected to this node.
    fn delete(&self, db: &DatabaseConnection, node_id: i64) -> impl Future<Output = Result<()>> {
        async move {
            log::warn!("Deleting node {}.", self.get_node_id());
            let node_id_column = Self::get_node_id_column();
            let mut active = DbNodeActive::new();
            active.set(node_id_column, node_id.into());
            active.delete(db).await?;
            Ok(())
        }
    }
}

pub trait NodeRaw<Node, DbModel, DbNodeActive>
where
    Self: Into<DbNodeActive> + Clone + Debug,
    DbModel: Into<Node> + From<<<DbNodeActive as ActiveModelTrait>::Entity as EntityTrait>::Model>,
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
    fn save(&self, db: &DatabaseConnection) -> impl Future<Output = Result<Node>> {
        async {
            use tap::Conv;
            let node_type = self.get_node_type();
            let node_id = create_node(db, node_type).await?.node_id;
            log::debug!(
                "Saving NodeType({node_type}) with id {node_id} with data: {:?}",
                *self
            );
            let mut value = (*self).clone().conv::<DbNodeActive>();
            value.set(self.get_node_id_column(), node_id.into());
            Ok(value.save_into_db(db).await?.into())
        }
    }
}
