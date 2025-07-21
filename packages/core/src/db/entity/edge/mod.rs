use crate::Result;
use sea_orm::{
    ActiveModelBehavior, ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait,
    IntoActiveModel, QueryFilter,
};
use tap::Conv;

#[allow(clippy::module_inception)]
pub mod edge;
pub mod perm_manage;
pub mod perm_view;

pub mod iden;
pub mod problem_limit;
pub mod problem_statement;
pub mod problem_tag;

pub trait DbEdgeInfo {
    fn get_edge_type(&self) -> &str;
}

pub trait DbEdgeActiveModel<MODEL, EDGE>
where
    MODEL: Into<EDGE>
        + From<<<Self as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Model>,
    Self: Sized + Send + Sync + ActiveModelTrait + ActiveModelBehavior,
{
    fn save_into_db(
        &self,
        db: &DatabaseConnection,
    ) -> impl std::future::Future<Output = Result<MODEL>> + Send
    where
        <Self::Entity as EntityTrait>::Model: IntoActiveModel<Self>,
    {
        async { Ok(self.clone().insert(db).await?.conv::<MODEL>()) }
    }
}

pub trait DbEdgeEntityModel<Model>
where
    Self: Sized + EntityTrait,
    Model: From<<Self as EntityTrait>::Model>,
{
    fn get_u_edge_id_column(&self) -> <Self as EntityTrait>::Column;
    fn get_v_edge_id_column(&self) -> <Self as EntityTrait>::Column;

    fn query_u_perm_view_edges(
        &self,
        db: &DatabaseConnection,
        u_node_id: i64,
    ) -> impl std::future::Future<Output = Result<Vec<Model>>> + Send {
        async move {
            let id_column = self.get_u_edge_id_column();
            let edges = Self::find().filter(id_column.eq(u_node_id)).all(db).await?;
            Ok(edges.into_iter().map(|e| e.into()).collect())
        }
    }

    fn query_v_perm_view_edges(
        &self,
        db: &DatabaseConnection,
        v_node_id: i64,
    ) -> impl std::future::Future<Output = Result<Vec<Model>>> {
        async move {
            let id_column = self.get_v_edge_id_column();
            let edges = Self::find().filter(id_column.eq(v_node_id)).all(db).await?;
            Ok(edges.into_iter().map(|e| e.into()).collect())
        }
    }
}
