//! router: perm
//! description: Create perm, you need create and you need restart system to make it work.
//! log_level required
//! --config -c <config>, config path.
//! args: <perm_type> <u> <v> <number>

use command_tool::run;
use log::LevelFilter;
use redis::Commands;
use rmjac_core::async_run;
use rmjac_core::env::db::get_connect;
use rmjac_core::model::content::{Description, DescriptionType};
use rmjac_core::model::event::{Event, EventParent, EventType};
use rmjac_core::model::language::Language::Chinese;
use rmjac_core::service::event::create_event;
use rmjac_core::service::perm;
use rmjac_core::service::perm::provider::{ManagePermService, SystemPermService};
use rmjac_core::utils::get_redis_connection;
use crate::{
    env::{CONFIG, env_load},
    handler, utils,
};

#[tokio::main]
#[run]
pub async fn run(
    config: Option<String>,
    log_level: Option<String>,
    perm_type: String,
    u: String,
    v: String,
    number: String
) {
    let config = config.unwrap_or_else(|| "config.json".to_string());
    let log_level: LevelFilter = log_level
        .unwrap_or_else(|| "info".to_string())
        .parse()
        .unwrap_or(LevelFilter::Info);
    let _ = utils::logger::setup_logger_with_stdout(log_level);
    log::info!("Creating Perm start.");
    let _ = env_load(&config);
    let redis_url = CONFIG.lock().unwrap().redis_url.clone().unwrap();
    *rmjac_core::env::REDIS_URL.lock().unwrap() = redis_url;
    *rmjac_core::env::DB_URL.lock().unwrap() = CONFIG.lock().unwrap().postgres_url.clone().unwrap();
    let db = get_connect().await.unwrap();
    let perm_type = perm_type.to_lowercase();
    let u = u.parse::<i64>().unwrap_or(0);
    let v = v.parse::<i64>().unwrap_or(0);
    let number = number.parse::<i64>().unwrap_or(0);
    match perm_type.as_str() {
        "system" => {
            SystemPermService::add(u, v, number, &db).await;
        },
        "manage" => {
            ManagePermService::add(u, v, number, &db).await;
        },
        _ => {
            log::error!("Unknown perm type: {}", perm_type);
        }
    }
    log::info!("Creating done.");
}
