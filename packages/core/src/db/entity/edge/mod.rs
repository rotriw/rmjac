use sea_orm::{ActiveModelBehavior, ActiveModelTrait, DatabaseConnection, ColumnTrait, QueryFilter, EntityTrait, IntoActiveModel};
use tap::Conv;
use crate::Result;

pub mod edge;
pub mod perm_view;
pub mod perm_manage;

pub trait DbEdgeInfo {
    fn get_edge_type(&self) -> &str;
}

pub trait DbEdgeActiveModel<MODEL, EDGE>
where
    MODEL: Into<EDGE>
        + From<<<Self as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Model>,
    Self: Sized + Send + Sync + ActiveModelTrait + ActiveModelBehavior,
{
    async fn save_into_db(&self, db: &DatabaseConnection) -> Result<MODEL>
    where
        <Self::Entity as EntityTrait>::Model: IntoActiveModel<Self>,
    {
        Ok(self.clone().insert(db).await?.conv::<MODEL>())
    }
}

pub trait DbEdgeEntityModel<Model> where
    Self: Sized + EntityTrait,
    Model: From<<Self as EntityTrait>::Model>,
    {
    fn get_u_edge_id_column(&self) -> <Self as EntityTrait>::Column;
    fn get_v_edge_id_column(&self) -> <Self as EntityTrait>::Column;

    async fn query_u_perm_view_edges(
        &self,
        db: &DatabaseConnection,
        u_node_id: i64,
    ) -> Result<Vec<Model>> {
        let id_column = self.get_u_edge_id_column();
        let edges = Self::find()
            .filter(id_column.eq(u_node_id))
            .all(db)
            .await?;
        Ok(edges.into_iter().map(|e| e.into()).collect())
    }

    async fn query_v_perm_view_edges(
        &self,
        db: &DatabaseConnection,
        v_node_id: i64,
    ) -> Result<Vec<Model>> {
        let id_column = self.get_v_edge_id_column();
        let edges = Self::find()
            .filter(id_column.eq(v_node_id))
            .all(db)
            .await?;
        Ok(edges.into_iter().map(|e| e.into()).collect())
    }
}