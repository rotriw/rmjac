use sea_orm::{query, DatabaseConnection};
use crate::{db::{entity::{self, edge::perm_view as db_perm_view}, iden::edge::perm_view::PermView}, error::CoreError};
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