//! router: dbinit
//! description: Initialize Database
//! log_level required
//! --url -u <url>, Database connection URL
//! --schema -s <schema>, Database schema name
//! --up -U <up>, Update existing tables(use \, to separate multiple tables\, default: all)
//! --down -D <down>, Drop existing tables(use \, to separate multiple tables\, default: null)
//! --mode -m <mode>, Database mode (deve or prod\, default: prod)
//! --restart -R <restart>, Restart database
//! --redis_url -r <redis_url>, Redis Url.

use command_tool::run;
use log::LevelFilter;
use redis::TypedCommands;

#[run]
pub fn run(
    restart: Option<String>,
    url: Option<String>,
    schema: Option<String>,
    up: Option<String>,
    down: Option<String>,
    log_level: Option<String>,
    mode: Option<String>,
    redis_url: Option<String>
) {
    let restart = restart.unwrap_or("false".to_string());
    let restart = if restart == "true" {
        true
    } else {
        false
    };
    let mode = mode.unwrap_or("prod".to_string());
    let url = url.unwrap_or("postgresql://localhost:5432".to_string());
    let redis_url = redis_url.unwrap_or("redis://localhost:6379".to_string());
    let schema = schema.unwrap_or("public".to_string());
    let up = up.unwrap_or("all".to_string());
    let up = up.split(',').collect::<Vec<&str>>();
    let down = down.unwrap_or("null".to_string());
    let down = down.split(',').collect::<Vec<&str>>();
    let log_level: LevelFilter = log_level
        .unwrap_or_else(|| "info".to_string())
        .parse()
        .unwrap_or(LevelFilter::Info);
    let _ = crate::utils::logger::setup_logger_with_stdout(log_level);
    if mode == "dev" {
        log::warn!("Debug mode is enabled.");
    }
    let data = rmjac_core::db::init::init(url.as_str(), schema.as_str(), mode.as_str(), up, down);

    let mut redis = redis::Client::open(redis_url).unwrap().get_connection().unwrap();
    if restart {
        log::info!("Reset redis global_id and other data.");
        redis.set("global_id", 6);
        redis.set("default_system_id", 2);
        redis.set("default_guest_id", 3);
        redis.set("default_strategy_id", 4);
        redis.set("default_iden_id", 5);
    }
    if data.is_err() {
        log::error!("Database initialization failed: {:?}", data.err());
    }
}
