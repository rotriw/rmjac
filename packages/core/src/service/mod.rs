use crate::env::{DB_SCHEMA, DB_URL, EDGE_AUTH_PUBLICKEY};
use crate::error::CoreError;
use crate::service::perm::provider::init_all_perms;
use sea_orm::DatabaseConnection;
use std::fs;

pub mod iden;
pub mod judge;
pub mod perm;
pub mod socket;
pub mod track;
pub mod cron;

pub async fn service_start(
    db: &DatabaseConnection,
    db_url: &str,
    db_schema: &str,
    vjudge_port: u16,
    vjudge_secret_path: &str,
) -> Result<(), CoreError> {
    log::info!("Initializing default nodes");
    let default_nodes = crate::graph::action::get_default_node(db).await?;
    log::info!("Default nodes initialized: {:?}", default_nodes);

    init_all_perms(db).await;
    log::info!("Permission graph loaded successfully!");

    let mut default_nodes_env = crate::env::DEFAULT_NODES.lock().unwrap();
    *default_nodes_env = default_nodes;
    log::info!("Loading DB connection: {db_url}, schema: {db_schema}");
    *DB_URL.lock().unwrap() = db_url.to_string();
    *DB_SCHEMA.lock().unwrap() = db_schema.to_string();
    let data = fs::read_to_string(vjudge_secret_path)?;
    *EDGE_AUTH_PUBLICKEY.lock().unwrap() = data.clone();
    log::info!("Starting socket service on port: {vjudge_port}");
    tokio::spawn(async move {
        socket::service::service_start(vjudge_port).await.unwrap();
    });
    log::info!("Starting cron service");
    tokio::spawn(async {
        cron::service_start().await;
    });
    Ok(())
}
