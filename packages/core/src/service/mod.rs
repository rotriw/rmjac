use sea_orm::DatabaseConnection;

use crate::error::CoreError;

pub mod judge;
pub mod track;

pub async fn service_start(db: &DatabaseConnection) -> Result<(), CoreError> {
    log::info!("init the default nodes");
    let default_nodes = crate::graph::action::get_default_node(db).await?;
    log::info!("Default nodes: {default_nodes:?}");
    let mut default_nodes_env = crate::env::DEFAULT_NODES.lock().unwrap();
    *default_nodes_env = default_nodes;
    Ok(())
}
