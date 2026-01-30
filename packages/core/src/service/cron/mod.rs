use tokio::sync::Mutex;
use chrono::Utc;
use cron_tab::{AsyncCron, Cron};
use lazy_static::lazy_static;
use crate::env::db::get_connect;
use crate::service::cron::init::get_task_cron_data;

lazy_static! {
    pub static ref CRON_INSTANCE: Mutex<AsyncCron<Utc>> = Mutex::new(AsyncCron::new(Utc));
}

pub mod tasks;
pub mod init;

pub async fn service_start() {
    log::info!("async cron service start");
    {
        let mut cron = CRON_INSTANCE.lock().await;
        cron.start().await;
    }
    let db = get_connect().await.unwrap();
    log::info!("init cron tasks");
    get_task_cron_data(&db).await;
}