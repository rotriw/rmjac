use std::fmt::Debug;
use crate::Result;
use crate::db::entity::edge::{DbEdgeActiveModel, DbEdgeInfo, edge::create_edge};
use crate::error::CoreError::NotFound;
use sea_orm::sea_query::IntoCondition;
use sea_orm::{ActiveModelBehavior, ActiveModelTrait, DatabaseConnection, EntityTrait, IntoActiveModel, QuerySelect};
use std::str::FromStr;
use tap::Conv;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EdgeType {
    PermProblem,
    PermPages,
    PermSystem,
    Record,
}

impl From<EdgeType> for &str {
    fn from(edge_type: EdgeType) -> Self {
        match edge_type {
            EdgeType::PermProblem => "perm_problem",
            EdgeType::PermPages => "perm_pages",
            EdgeType::PermSystem => "perm_system",
            EdgeType::Record => "record",
        }
    }
}

pub mod iden;
pub mod misc;
pub mod perm_manage;
pub mod perm_pages;
pub mod perm_problem;
pub mod perm_system;
pub mod perm_view;
pub mod problem_limit;
pub mod problem_statement;
pub mod problem_tag;
pub mod record;
pub mod training_problem;
pub mod user_remote;

pub mod testcase;
pub mod judge;

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
        + From<<<DbActive as ActiveModelTrait>::Entity as EntityTrait>::Model>,
    <DbActive::Entity as EntityTrait>::Model: IntoActiveModel<DbActive>,
    Self: Sized + Send + Sync + Clone,
    DbEntity: EntityTrait,
    EdgeA: Edge<DbActive, DbModel, DbEntity>,
    <DbEntity as EntityTrait>::Model: Into<DbModel>,
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

    fn get_edge_id_column() -> <DbEntity as EntityTrait>::Column {
        <DbEntity as EntityTrait>::Column::from_str("id")
            .ok()
            .unwrap()
    }


    fn get_u_edge_id_column_2() -> <<DbActive as ActiveModelTrait>::Entity as EntityTrait>::Column {
        <<DbActive as ActiveModelTrait>::Entity as EntityTrait>::Column::from_str("u_node_id")
            .ok()
            .unwrap()
    }

    fn get_v_edge_id_column_2() -> <<DbActive as ActiveModelTrait>::Entity as EntityTrait>::Column {
        <<DbActive as ActiveModelTrait>::Entity as EntityTrait>::Column::from_str("v_node_id")
            .ok()
            .unwrap()
    }

    fn get_edge_id_column_2() -> <<DbActive as ActiveModelTrait>::Entity as EntityTrait>::Column {
        <<DbActive as ActiveModelTrait>::Entity as EntityTrait>::Column::from_str("id")
            .ok()
            .unwrap()
    }

    fn get_v(
        u: i64,
        db: &DatabaseConnection,
    ) -> impl Future<Output = Result<Vec<i64>>> {
        async move {
            use sea_orm::{ColumnTrait, QueryFilter};
            let edges = DbEntity::find()
                .filter(Self::get_u_edge_id_column().eq(u))
                .all(db)
                .await?;
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
    ) -> impl Future<Output = Result<Vec<i64>>> {
        async move {
            use sea_orm::{ColumnTrait, QueryFilter};
            let edges = DbEntity::find()
                .filter(filter)
                .filter(Self::get_u_edge_id_column().eq(u))
                .all(db)
                .await?;
                        Ok(edges
                .into_iter()
                .map(|edge| edge.conv::<DbModel>().conv::<EdgeA>().get_v_node_id())
                .collect())
        }
    }

    fn get_v_filter_extend<T: IntoCondition>(
        u: i64,
        filter: Vec<T>,
        db: &DatabaseConnection,
        number_per_page: Option<u64>,
        offset: Option<u64>,
    ) -> impl Future<Output = Result<Vec<(i64, i64)>>> {
        async move {
            use sea_orm::{ColumnTrait, QueryFilter};
            let mut edges = DbEntity::find();
            for f in filter {
                edges = edges.filter(f);
            }
            edges = edges.filter(Self::get_u_edge_id_column().eq(u));
            edges = if let (Some(number_per_page), Some(offset)) = (number_per_page, offset) {
                edges.offset(offset).limit(number_per_page)
            } else {
                edges
            };
            let edges = edges.all(db).await?;
                        Ok(edges
                .into_iter()
                .map(|edge| {
                    let edge_a = edge.conv::<DbModel>().conv::<EdgeA>();
                    (edge_a.get_v_node_id(), edge_a.get_edge_id())
                })
                .collect())
        }
    }

    fn get_v_filter_extend_content<T: IntoCondition>(
        u: i64,
        filter: Vec<T>,
        db: &DatabaseConnection,
        number_per_page: Option<u64>,
        offset: Option<u64>,
    ) -> impl Future<Output = Result<Vec<EdgeA>>> {
        async move {
            use sea_orm::{ColumnTrait, QueryFilter};
            let mut edges = DbEntity::find();
            for f in filter {
                edges = edges.filter(f);
            }
            edges = edges.filter(Self::get_u_edge_id_column().eq(u));
            edges = if let (Some(number_per_page), Some(offset)) = (number_per_page, offset) {
                edges.offset(offset).limit(number_per_page)
            } else {
                edges
            };
            let edges = edges.all(db).await?;
                        Ok(edges
                .into_iter()
                .map(|edge| {
                    edge.into().into()
                })
                .collect())
        }
    }

    fn get_v_one_filter_extend<T: IntoCondition>(
        u: i64,
        filter: T,
        db: &DatabaseConnection,
    ) -> impl Future<Output = Result<EdgeA>> {
        async move {
            use sea_orm::{ColumnTrait, QueryFilter};
            let edge = DbEntity::find()
                .filter(filter)
                .filter(Self::get_u_edge_id_column().eq(u))
                .one(db)
                .await?;
            if edge.is_none() {
                return Err(NotFound("Not Found Edge id".to_string()));
            }
            Ok(edge
                .unwrap()
                .conv::<DbModel>()
                .conv::<EdgeA>())
        }
    }

    fn get_u(
        v: i64,
        db: &DatabaseConnection,
    ) -> impl Future<Output = Result<Vec<i64>>> {
        async move {
            use sea_orm::{ColumnTrait, QueryFilter};
            let edges = DbEntity::find()
                .filter(Self::get_v_edge_id_column().eq(v))
                .all(db)
                .await?;
                        Ok(edges
                .into_iter()
                .map(|edge| edge.conv::<DbModel>().conv::<EdgeA>().get_u_node_id())
                .collect())
        }
    }


    fn get_u_one(
        v: i64,
        db: &DatabaseConnection,
    ) -> impl Future<Output = Result<i64>> {
        async move {
            use sea_orm::{ColumnTrait, QueryFilter};
            let edge = DbEntity::find()
                .filter(Self::get_v_edge_id_column().eq(v))
                .one(db)
                .await?;
            if edge.is_none() {
                return Err(NotFound("Not Found Edge id".to_string()));
            }
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
    ) -> impl Future<Output = Result<i64>> {
        async move {
            use sea_orm::{ColumnTrait, QueryFilter};
            let edge = DbEntity::find()
                .filter(Self::get_u_edge_id_column().eq(u))
                .one(db)
                .await?;
            if edge.is_none() {
                return Err(NotFound("Not Found Edge id".to_string()));
            }
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
    ) -> impl Future<Output = Result<Vec<i64>>> {
        async move {
            use sea_orm::{ColumnTrait, QueryFilter};
            let edges = DbEntity::find()
                .filter(filter)
                .filter(Self::get_v_edge_id_column().eq(v))
                .all(db)
                .await?;
                        Ok(edges
                .into_iter()
                .map(|edge| edge.conv::<DbModel>().conv::<EdgeA>().get_u_node_id())
                .collect())
        }
    }

    fn get_u_filter_extend<T: IntoCondition>(
        v: i64,
        filter: Vec<T>,
        db: &DatabaseConnection,
        number_per_page: Option<u64>,
        offset: Option<u64>,
    ) -> impl Future<Output = Result<Vec<(i64, i64)>>> {
        async move {
            use sea_orm::{ColumnTrait, QueryFilter};
            let mut edges = DbEntity::find();
            for f in filter {
                edges = edges.filter(f);
            }
            edges = edges.filter(Self::get_v_edge_id_column().eq(v));
            edges = if let (Some(number_per_page), Some(offset)) = (number_per_page, offset) {
                edges.offset(offset).limit(number_per_page)
            } else {
                edges
            };
            let edges = edges.all(db).await?;
                        Ok(edges
                .into_iter()
                .map(|edge| {
                    let edge_a = edge.conv::<DbModel>().conv::<EdgeA>();
                    (edge_a.get_v_node_id(), edge_a.get_edge_id())
                })
                .collect())
        }
    }

    fn get_u_filter_extend_content<T: IntoCondition>(
        v: i64,
        filter: Vec<T>,
        db: &DatabaseConnection,
        number_per_page: Option<u64>,
        offset: Option<u64>,
    ) -> impl Future<Output = Result<Vec<EdgeA>>> {
        async move {
            use sea_orm::{ColumnTrait, QueryFilter};
            let mut edges = DbEntity::find();
            for f in filter {
                edges = edges.filter(f);
            }
            edges = edges.filter(Self::get_v_edge_id_column().eq(v));
            edges = if let (Some(number_per_page), Some(offset)) = (number_per_page, offset) {
                edges.offset(offset).limit(number_per_page)
            } else {
                edges
            };
            let edges = edges.all(db).await?;
                        Ok(edges
                .into_iter()
                .map(|edge| {
                    edge.into().into()
                })
                .collect())
        }
    }

    fn delete(
        db: &DatabaseConnection,
        u: i64,
        v: i64,
    ) -> impl Future<Output = Result<()>>{
        async move {
            let mut edge = DbActive::new();
            edge.set(Self::get_u_edge_id_column_2(), u.into());
            edge.set(Self::get_v_edge_id_column_2(), v.into());
            edge.delete(db).await?;
            log::warn!("(Edge Delete){}, u: {u}, v: {v}", Self::get_edge_type());
            Ok(())
        }
    }

    fn delete_from_id(
        db: &DatabaseConnection,
        id: i64,
    ) -> impl Future<Output = Result<()>> {
        async move {
            let mut edge = DbActive::new();
            edge.set(Self::get_edge_id_column_2(), id.into());
            edge.delete(db).await?;
            log::warn!("(Edge Delete){}, id: {id}", Self::get_edge_type());
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
    ) -> impl Future<Output = Result<Vec<(i64, i64)>>>;

    fn get_perm_iter() -> impl Iterator<Item = i64>;

    fn get_all(
        db: &DatabaseConnection,
    ) -> impl Future<Output = Result<Vec<(i64, i64, i64)>>>;
}

pub trait EdgeQueryOrder<DbActive, DbModel, DbEntity, Edge> {
    fn get_order_id(u: i64, order: i64, db: &DatabaseConnection) -> impl Future<Output = Result<i64>>;
    fn get_order_desc(u: i64, db: &DatabaseConnection) -> impl Future<Output = Result<Vec<i64>>>;
    fn get_order_asc(u: i64, db: &DatabaseConnection) -> impl Future<Output = Result<Vec<i64>>>;
    fn get_order_asc_extend(u: i64, db: &DatabaseConnection) -> impl Future<Output = Result<Vec<Edge>>>;
    fn get_order_desc_extend(u: i64, db: &DatabaseConnection) -> impl Future<Output = Result<Vec<Edge>>>;
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
        + From<<<DbActive as ActiveModelTrait>::Entity as EntityTrait>::Model>,
    <DbActive::Entity as EntityTrait>::Model: IntoActiveModel<DbActive>,
    Self: Sized + Send + Sync + Clone,
    DbEntity: EntityTrait,
    <DbEntity as EntityTrait>::Model: Into<DbModel>,
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
    ) -> impl Future<Output = Result<Self>> + Send {
        async move {
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

    fn modify<T: Into<sea_orm::Value> + Debug>(
        &self,
        db: &DatabaseConnection,
        column: <DbActive::Entity as EntityTrait>::Column,
        data: T,
    ) -> impl Future<Output = Result<Self>> {
        async move {
            use tap::Conv;
            let mut new_model = DbActive::new();
            let edge_id_column = Self::get_edge_id_column();
            new_model.set(edge_id_column, self.get_edge_id().into());
            new_model.set(column, data.into());
            let data = new_model.update(db).await?.conv::<DbModel>();
            Ok(data.into())
        }
    }
}

pub trait EdgeRaw<Edge, EdgeModel, EdgeActive>
where
    Self: Into<EdgeActive> + Clone + Send + Sync + std::fmt::Debug,
    EdgeModel: Into<Edge>
        + Send
        + Sync
        + From<<<EdgeActive as ActiveModelTrait>::Entity as EntityTrait>::Model>,
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
    fn get_u_node_id(&self) -> i64;
    fn get_v_node_id(&self) -> i64;
    
    /// 获取权限值，对于非权限边返回 None
    fn get_perm_value(&self) -> Option<i64> {
        None
    }
    
    fn save(&self, db: &DatabaseConnection) -> impl Future<Output = Result<Edge>> {
        async {
            let edge_type = self.get_edge_type();
            let edge_id = create_edge(db, edge_type).await?.edge_id;
            log::debug!("Saving edge({edge_type}), data:{:?}", *self);
            
            // 如果是权限边，同步更新内存中的权限图
            if let Some(perm) = self.get_perm_value() {
                let u = self.get_u_node_id();
                let v = self.get_v_node_id();
                crate::model::perm::add_perm_edge_to_graph(edge_type, u, v, edge_id, perm);
            }
            
            let mut value = (*self).clone().conv::<EdgeActive>();
            value.set(self.get_edge_id_column(), edge_id.into());
            Ok(value.save_into_db(db).await?.into())
        }
    }
}
