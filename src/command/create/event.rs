//! router: event
//! description: Create event
//! log_level required
//! --config -c <config>, config path.
//! args: <parent> <new_event> <iden_list>

use command_tool::run;
use log::LevelFilter;
use redis::Commands;
use sea_orm::Iden;
use rmjac_core::async_run;
use rmjac_core::env::db::get_connect;
use rmjac_core::model::content::{Description, DescriptionType};
use rmjac_core::model::event::{Event, EventParent, EventType};
use rmjac_core::model::language::Language::Chinese;
use rmjac_core::service::event::create_event;
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
    parent: String,
    new_event: String,
    iden_list: String,
) {
    let config = config.unwrap_or_else(|| "config.json".to_string());
    let log_level: LevelFilter = log_level
        .unwrap_or_else(|| "info".to_string())
        .parse()
        .unwrap_or(LevelFilter::Info);
    let _ = utils::logger::setup_logger_with_stdout(log_level);
    log::info!("Creating event handler");
    let _ = env_load(&config);
    let redis_url = CONFIG.lock().unwrap().redis_url.clone().unwrap();
    *rmjac_core::env::REDIS_URL.lock().unwrap() = redis_url;
    *rmjac_core::env::DB_URL.lock().unwrap() = CONFIG.lock().unwrap().postgres_url.clone().unwrap();
    log::info!("Creating event handler");
    let db = get_connect().await.unwrap();
    let iden_list = iden_list.split(",").map(|s| s.trim().to_string()).collect();
    let x = create_event(Event {
        owned_by: EventParent::ID(0),
        name: new_event,
        sign: None,
        iden_list,
        event_type: EventType::Other,
        description: Description {
            content: "".to_string(),
            description_type: DescriptionType::Typst,
        },
        contest_type: None,
        language: Chinese,
        start_time: None,
        end_time: None,
        event_status: rmjac_core::model::event::EventStatus::NotStarted,
        event_url: None,
    }, &db).await;
    if let Err(e) = x {
        log::error!("Failed to create event: {:?}", e);
    } else {
        log::info!("Event created successfully");
    }
}
