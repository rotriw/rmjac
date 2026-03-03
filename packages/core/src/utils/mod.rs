use crate::env;
use crate::env::db::refresh_redis;

pub mod encrypt;

pub fn get_redis_connection() -> r2d2::PooledConnection<redis::Client> {
    let locked = env::REDIS_POOL.lock();
    if let Ok(cli) = locked {
        log::trace!("redis- now state: {:?}", cli.state());
        let cli = cli.get();
        if let Ok(cli) = cli {
            return cli;
        }
        log::error!("redis-error.");
    } else {
        log::error!("redis-error: {:?}", locked.err());
    }
    panic!("Redis raise error...");
}
