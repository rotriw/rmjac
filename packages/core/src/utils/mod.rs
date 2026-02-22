use crate::env;
use crate::env::db::refresh_redis;

pub mod encrypt;

pub fn get_redis_connection() -> r2d2::PooledConnection<redis::Client> {
    env::REDIS_POOL
        .lock()
        .unwrap()
        .get()
        .unwrap()
}