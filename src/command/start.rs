//! router: start
//! description: Start Server
//! log_level required
//! --port -p <port>, Server will listen on this port(defailt: 1824)
//! --config -c <config>, Server will use this config file
//! --host -H <host>, Server will listen on this host (default: 127.0.0.1)

use log::LevelFilter;

use crate::{
    env::{CONFIG, env_load},
    handler, utils,
};

pub fn run(
    port: Option<String>,
    host: Option<String>,
    config: Option<String>,
    log_level: Option<String>,
) -> Option<()> {
    let port = port.unwrap_or("1824".to_string()).parse::<u16>().unwrap();
    let host = host.unwrap_or("127.0.0.1".to_string());
    let config = config.unwrap_or_else(|| "config.json".to_string());
    let log_level: LevelFilter = log_level
        .unwrap_or_else(|| "info".to_string())
        .parse()
        .unwrap_or(LevelFilter::Info);
    let _ = utils::logger::setup_logger_with_stdout(log_level);
    let _ = env_load(&config);
    let redis_url = CONFIG.lock().unwrap().redis_url.clone().unwrap();
    let mut env_redis_url = core::env::REDIS_URL.lock().unwrap();
    *env_redis_url = redis_url;
    let _ = handler::main(host.as_str(), port);
    Some(())
}
