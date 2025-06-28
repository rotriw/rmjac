use sea_orm::DatabaseConnection;

use crate::graph::edge::EdgeType;
use crate::Result;

pub async fn get_outdegree(
    db: &DatabaseConnection,
    node_id: i64,
    edge_type: EdgeType,
) -> Result<Vec<(i64, i64)>> {
    edge_type.get_outdegree(db, node_id).await
}

pub async fn get_indegree(
    db: &DatabaseConnection,
    node_id: i64,
    edge_type: EdgeType,
) -> Result<Vec<(i64, i64)>> {
    edge_type.get_indegree(db, node_id).await
}