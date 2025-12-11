use std::fs;
use sea_orm::DatabaseConnection;
use crate::env::{DB_SCHEMA, DB_URL, EDGE_AUTH_PUBLICKEY};
use crate::error::CoreError;

pub mod judge;
pub mod track;
pub mod iden;

pub async fn service_start(db: &DatabaseConnection, db_url: &str, db_schema: &str, vjudge_port: u16, vjudge_secret_path: &str) -> Result<(), CoreError> {
    log::info!("Initializing default nodes");
    let default_nodes = crate::graph::action::get_default_node(db).await?;
    log::info!("Default nodes initialized: {:?}", default_nodes);
    let mut default_nodes_env = crate::env::DEFAULT_NODES.lock().unwrap();
    *default_nodes_env = default_nodes;
    log::info!("Loading DB connection: {db_url}, schema: {db_schema}");
    *DB_URL.lock().unwrap() = db_url.to_string();
    *DB_SCHEMA.lock().unwrap() = db_schema.to_string();
    let data = fs::read_to_string(vjudge_secret_path)?;
    *EDGE_AUTH_PUBLICKEY.lock().unwrap() = data.clone();
    log::info!("Starting judge service on port: {vjudge_port}");
    tokio::spawn(async move {
        judge::service::service_start(vjudge_port).await.unwrap();
    });
    Ok(())
}
