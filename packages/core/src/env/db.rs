use sea_orm::{ConnectOptions, Database, DatabaseConnection};
use crate::env::{CONNECTION_POOL, DB_SCHEMA, DB_URL};
use crate::Result;


#[allow(clippy::await_holding_lock)]
pub async fn get_connect() -> Result<DatabaseConnection> {
    let need_connect = CONNECTION_POOL.lock().unwrap().is_none();
    let need_connect = need_connect || {
        let guard = CONNECTION_POOL.lock().unwrap().clone().unwrap();
        guard.ping().await.is_err()
    };
    if need_connect {
        let mut options = ConnectOptions::new(DB_URL.lock().unwrap().clone())
            .set_schema_search_path(DB_SCHEMA.lock().unwrap().clone())
            .to_owned();
        options.max_connections(100);
        *CONNECTION_POOL.lock().unwrap() = Some(Database::connect(options).await?);
    }
    Ok(CONNECTION_POOL.lock().unwrap().clone().unwrap())
}
