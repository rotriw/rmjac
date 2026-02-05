use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter};
use crate::env::db::get_connect;
use crate::graph::node::vjudge_task::VjudgeTaskNode;
use crate::model::vjudge::VjudgeTask;

pub async fn handle_vjudge_task(t: VjudgeTaskNode) {
    let log = t.public.log;
    let c = log.split('\n').collect::<Vec<&str>>();
    let cron = 'scope: {
        for l in &c {
            if l.starts_with("cron:") {
                break 'scope &l[5..];
            }
        }
        break 'scope "0 0 * * * * *"; // default to every hour.
    };
    let mut related_info = vec![];
    let mut related = false;
    let id = t.node_id;
    for l in c {
        if l.starts_with("[TASK_DONE]") {
            related = false;
        }
        if related {
            related_info.push(l.to_string());
        }
        if l.starts_with("[TASK_INFO]") {
            related = true;
        }
    }
    let mut cron_ins = super::CRON_INSTANCE.lock().await;
    let result = cron_ins.add_fn(cron, move || {
        let info = related_info.clone();
        async move {
            let result = super::tasks::run_task(info).await;
            let t = if let Err(e) = result {
                format!("[CRON_TASK_ERROR] {}\n", e)
            } else {
                format!("[CRON_TASK_SUCCESS] Task executed successfully. message: {} \n", result.unwrap())
            };
            let db = get_connect().await;
            if let Ok(db) = db {
                let _ = VjudgeTask::update_log(&db, id, t).await;
            } else {
                log::warn!("Cant find db Err:{:?}", db.err().unwrap());
            }
        }
    }).await;
    if let Err(e) = result {
        log::error!("Failed to add cron task for vjudge task {}: {}", t.node_id, e);
    } else {
        log::info!("Cron task added for vjudge task {}", t.node_id);
    }
}

pub async fn get_task_cron_data(db: &DatabaseConnection) {
    use crate::db::entity::node::vjudge_task::{Entity, Column};
    let tasks = Entity::find()
        .filter(Column::Status.eq("cron_online"))
        .all(db)
        .await
        .unwrap();
    log::info!("there are {} cron vjudge tasks to init.", tasks.len());
    for task in tasks {
        handle_vjudge_task(task.into()).await;
    }
}
