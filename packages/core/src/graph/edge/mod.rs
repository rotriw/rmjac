use crate::Result;
use crate::db::entity::edge::{DbEdgeActiveModel, DbEdgeInfo, edge::create_edge};
use crate::error::CoreError;
use crate::error::CoreError::{NotFound, StringError};
use sea_orm::sea_query::IntoCondition;
use sea_orm::{ActiveModelBehavior, ActiveModelTrait, DatabaseConnection, EntityTrait, IntoActiveModel, ModelTrait};
use std::str::FromStr;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EdgeType {
    PermView,
}

impl From<EdgeType> for &str {
    fn from(edge_type: EdgeType) -> Self {
        match edge_type {
            EdgeType::PermView => "perm_view",
        }
    }
}

pub mod iden;
pub mod perm_manage;
pub mod perm_view;
pub mod problem_limit;
pub mod problem_statement;
pub mod problem_tag;

pub trait EdgeQuery<DbActive, DbModel, DbEntity, EdgeA>
where
    DbActive: DbEdgeActiveModel<DbModel, EdgeA>
        + Sized
        + Send
        + Sync
        + ActiveModelTrait
        + ActiveModelBehavior
        + DbEdgeInfo,
    DbModel: Into<EdgeA>
        + From<<<DbActive as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Model>,
    <DbActive::Entity as EntityTrait>::Model: IntoActiveModel<DbActive>,
    Self: Sized + Send + Sync + Clone,
    DbEntity: EntityTrait,
    EdgeA: Edge<DbActive, DbModel, DbEntity>,
    <DbEntity as sea_orm::EntityTrait>::Model: Into<DbModel>,
{
    fn get_u_edge_id_column() -> <DbEntity as EntityTrait>::Column {
        <DbEntity as EntityTrait>::Column::from_str("u_node_id")
            .ok()
            .unwrap()
    }

    fn get_v_edge_id_column() -> <DbEntity as EntityTrait>::Column {
        <DbEntity as EntityTrait>::Column::from_str("v_node_id")
            .ok()
            .unwrap()
    }

    fn get_u_edge_id_column_2() -> <<DbActive as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Column {
        <<DbActive as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Column::from_str("u_node_id")
            .ok()
            .unwrap()
    }

    fn get_v_edge_id_column_2() -> <<DbActive as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Column {
        <<DbActive as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Column::from_str("v_node_id")
            .ok()
            .unwrap()
    }

    fn get_v(
        u: i64,
        db: &DatabaseConnection,
    ) -> impl std::future::Future<Output = Result<Vec<i64>>> {
        async move {
            use sea_orm::{ColumnTrait, QueryFilter};
            let edges = DbEntity::find()
                .filter(Self::get_u_edge_id_column().eq(u))
                .all(db)
                .await?;
            use tap::Conv;
            Ok(edges
                .into_iter()
                .map(|edge| edge.conv::<DbModel>().conv::<EdgeA>().get_v_node_id())
                .collect())
        }
    }

    fn get_v_filter<T: IntoCondition>(
        u: i64,
        filter: T,
        db: &DatabaseConnection,
    ) -> impl std::future::Future<Output = Result<Vec<i64>>> {
        async move {
            use sea_orm::{ColumnTrait, QueryFilter};
            let edges = DbEntity::find()
                .filter(filter)
                .filter(Self::get_u_edge_id_column().eq(u))
                .all(db)
                .await?;
            use tap::Conv;
            Ok(edges
                .into_iter()
                .map(|edge| edge.conv::<DbModel>().conv::<EdgeA>().get_v_node_id())
                .collect())
        }
    }

    fn get_u(
        v: i64,
        db: &DatabaseConnection,
    ) -> impl std::future::Future<Output = Result<Vec<i64>>> {
        async move {
            use sea_orm::{ColumnTrait, QueryFilter};
            let edges = DbEntity::find()
                .filter(Self::get_v_edge_id_column().eq(v))
                .all(db)
                .await?;
            use tap::Conv;
            Ok(edges
                .into_iter()
                .map(|edge| edge.conv::<DbModel>().conv::<EdgeA>().get_u_node_id())
                .collect())
        }
    }

    fn get_u_one(
        v: i64,
        db: &DatabaseConnection,
    ) -> impl std::future::Future<Output = Result<i64>> {
        async move {
            use sea_orm::{ColumnTrait, QueryFilter};
            let edge = DbEntity::find()
                .filter(Self::get_v_edge_id_column().eq(v))
                .one(db)
                .await?;
            if edge.is_none() {
                return Err(NotFound("Not Found Edge id".to_string()));
            }
            use tap::Conv;
            Ok(edge
                .unwrap()
                .conv::<DbModel>()
                .conv::<EdgeA>()
                .get_u_node_id())
        }
    }

    fn get_v_one(
        u: i64,
        db: &DatabaseConnection,
    ) -> impl std::future::Future<Output = Result<i64>> {
        async move {
            use sea_orm::{ColumnTrait, QueryFilter};
            let edge = DbEntity::find()
                .filter(Self::get_u_edge_id_column().eq(u))
                .one(db)
                .await?;
            if edge.is_none() {
                return Err(NotFound("Not Found Edge id".to_string()));
            }
            use tap::Conv;
            Ok(edge
                .unwrap()
                .conv::<DbModel>()
                .conv::<EdgeA>()
                .get_v_node_id())
        }
    }

    fn get_u_filter<T: IntoCondition>(
        v: i64,
        filter: T,
        db: &DatabaseConnection,
    ) -> impl std::future::Future<Output = Result<Vec<i64>>> {
        async move {
            use sea_orm::{ColumnTrait, QueryFilter};
            let edges = DbEntity::find()
                .filter(filter)
                .filter(Self::get_v_edge_id_column().eq(v))
                .all(db)
                .await?;
            use tap::Conv;
            Ok(edges
                .into_iter()
                .map(|edge| edge.conv::<DbModel>().conv::<EdgeA>().get_u_node_id())
                .collect())
        }
    }

    fn destroy_edge(
        db: &DatabaseConnection,
        u: i64,
        v: i64,
    ) -> impl std::future::Future<Output = Result<()>>{
        async move {
            use sea_orm::{ColumnTrait, QueryFilter};
            let mut edge = DbActive::new();
            edge.set(Self::get_u_edge_id_column_2(), u.into());
            edge.set(Self::get_v_edge_id_column_2(), v.into());
            edge.delete(db).await?;
            Ok(())
        }
    }

    fn get_edge_type() -> &'static str;
    fn check_perm(perm_a: i64, perm_b: i64) -> bool {
        // perm_b require perm_A ?
        (perm_a & perm_b) == perm_a
    }
}

pub trait EdgeQueryPerm {
    fn get_perm_v(
        i: i64,
        db: &DatabaseConnection,
    ) -> impl std::future::Future<Output = Result<Vec<(i64, i64)>>>;

    fn get_perm_iter() -> impl Iterator<Item = i64>;

    fn get_all(
        db: &DatabaseConnection,
    ) -> impl std::future::Future<Output = Result<Vec<(i64, i64, i64)>>>;
}

pub trait Edge<DbActive, DbModel, DbEntity>
where
    DbActive: DbEdgeActiveModel<DbModel, Self>
        + Sized
        + Send
        + Sync
        + ActiveModelTrait
        + ActiveModelBehavior
        + DbEdgeInfo,
    DbModel: Into<Self>
        + From<<<DbActive as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Model>,
    <DbActive::Entity as EntityTrait>::Model: IntoActiveModel<DbActive>,
    Self: Sized + Send + Sync + Clone,
    DbEntity: EntityTrait,
    <DbEntity as sea_orm::EntityTrait>::Model: Into<DbModel>,
{
    fn get_edge_id_column() -> <DbActive::Entity as EntityTrait>::Column {
        <DbActive::Entity as EntityTrait>::Column::from_str("edge_id")
            .ok()
            .unwrap()
    }
    fn get_edge_id(&self) -> i64;
    fn get_u_node_id(&self) -> i64;
    fn get_v_node_id(&self) -> i64;

    fn from_db(
        db: &DatabaseConnection,
        edge_id: i64,
    ) -> impl std::future::Future<Output = Result<Self>> + Send {
        async move {
            use tap::Conv;
            let edge_id_column = Self::get_edge_id_column();
            use sea_orm::ColumnTrait;
            use sea_orm::QueryFilter;
            let model = DbEntity::find()
                .filter(edge_id_column.eq(edge_id))
                .one(db)
                .await?
                .ok_or_else(|| NotFound(format!("Edge with id {edge_id} not found")))?;
            Ok(model.conv::<DbModel>().into())
        }
    }
}

pub trait EdgeRaw<Edge, EdgeModel, EdgeActive>
where
    Self: Into<EdgeActive> + Clone + Send + Sync + std::fmt::Debug,
    EdgeModel: Into<Edge>
        + Send
        + Sync
        + From<<<EdgeActive as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Model>,
    EdgeActive: DbEdgeActiveModel<EdgeModel, Edge>
        + Sized
        + Send
        + Sync
        + ActiveModelTrait
        + ActiveModelBehavior
        + DbEdgeInfo,
    <EdgeActive::Entity as EntityTrait>::Model: IntoActiveModel<EdgeActive> + Send + Sync,
{
    fn get_edge_type(&self) -> &str;
    fn get_edge_id_column(&self) -> <EdgeActive::Entity as EntityTrait>::Column;
    fn save(&self, db: &DatabaseConnection) -> impl std::future::Future<Output = Result<Edge>> {
        async {
            use tap::Conv;
            let edge_type = self.get_edge_type();
            let edge_id = create_edge(db, edge_type).await?.edge_id;
            log::info!("Saving edge({edge_type}), data:{:?}", *self);
            let mut value = (*self).clone().conv::<EdgeActive>();
            value.set(self.get_edge_id_column(), edge_id.into());
            Ok(value.save_into_db(db).await?.into())
        }
    }
}
