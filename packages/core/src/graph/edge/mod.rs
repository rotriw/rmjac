use sea_orm::{query, ActiveModelBehavior, ActiveModelTrait, DatabaseConnection, EntityTrait, IntoActiveModel};
use crate::{db::{entity::{self, edge::{self, edge::create_edge, perm_view as db_perm_view, DbEdgeActiveModel, DbEdgeInfo}}, iden::edge::perm_view::PermView}, error::CoreError};
use crate::Result;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EdgeType {
    PermView,
}

impl<'a> From<EdgeType> for &'a str {
    fn from(edge_type: EdgeType) -> Self {
        match edge_type {
            EdgeType::PermView => "perm_view",
        }
    }
}

pub mod perm_view;
pub mod perm_manage;

pub trait Edge {
    fn get_edge_id(&self) -> i64;
    async fn from_db(db: &DatabaseConnection, edge_id: i64) -> Result<Self>
    where
        Self: Sized;
}

pub trait EdgeRaw<Edge, EdgeModel, EdgeActive>
where
    Self: Into<EdgeActive> + Clone,
    EdgeModel: Into<Edge>
    + From<<<EdgeActive as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Model>,
    EdgeActive: DbEdgeActiveModel<EdgeModel, Edge>
        + Sized
        + Send
        + Sync
        + ActiveModelTrait
        + ActiveModelBehavior
        + DbEdgeInfo,
    <EdgeActive::Entity as EntityTrait>::Model: IntoActiveModel<EdgeActive>,
{
    fn get_edge_type(&self) -> &str;
    fn get_edge_id_column(&self) -> <EdgeActive::Entity as EntityTrait>::Column;
    async fn save(&self, db: &DatabaseConnection) -> Result<Edge> {
        use tap::Conv;
        let edge_type = self.get_edge_type();
        let edge_id = create_edge(db, edge_type).await?.edge_id;
        let mut value = (*self).clone().conv::<EdgeActive>();
        value.set(self.get_edge_id_column(), edge_id.into());
        Ok(value.save_into_db(db)
            .await?.into())
    }
}

impl EdgeType {
    pub async fn get_outdegree(
        &self,
        db: &DatabaseConnection,
        node_id: i64,
    ) -> Result<Vec<(i64, i64)>> {
        match self {
            EdgeType::PermView => {
                let result = db_perm_view::query_u_perm_view_edges(db, node_id).await?;
                let result = result
                    .into_iter()
                    .map(|edge| (edge.v_node_id, edge.perm))
                    .collect();
                Ok(result)
            }
        }
    }

    pub async fn get_indegree(
        &self,
        db: &DatabaseConnection,
        node_id: i64,
    ) -> Result<Vec<(i64, i64)>> {
        match self {
            EdgeType::PermView => {
                let result = db_perm_view::query_v_perm_view_edges(db, node_id).await?;
                let result = result
                    .into_iter()
                    .map(|edge| (edge.u_node_id, edge.perm))
                    .collect();
                Ok(result)
            }
        }
    }

}