use crate::env;
use crate::env::db::refresh_redis;

pub mod encrypt;
pub mod perm;


pub fn get_redis_connection() -> redis::Connection {
    if let Ok(client) = env::REDIS_CLIENT.lock() && let Ok(client) = client.get_connection() {
        client
    } else {
        log::error!("Redis connection failed, try reconnecting... the handler will panic.");
        refresh_redis();
        env::REDIS_CLIENT
            .lock()
            .unwrap()
            .get_connection()
            .expect("Redis reconnection failed")
    }
}
