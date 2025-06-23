use sea_orm::DatabaseConnection;

use crate::{db::entity, error::CoreError};

pub async fn add_edge(db: &DatabaseConnection, edge_type: &str, u_id: i64, v_id: i64) -> Result<(), CoreError> {
    let edge = entity::edge::edge::create_edge(db, edge_type, u_id, v_id).await?;
    Ok(())
}