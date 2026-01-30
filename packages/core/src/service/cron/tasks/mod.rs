use deno_core::futures::future::err;
use crate::error::CoreError;
use crate::Result;

/*
Run a cron task with given detail information.
*/
pub async fn run_task(detail: Vec<String>) -> Result<String> {
    let mut now_tasks = "".to_string();
    let mut log = "".to_string();
    let mut err_log = "".to_string();
    for l in detail {
        if now_tasks.is_empty() {
            now_tasks = l.clone();
            continue;
        }
        match now_tasks.as_str() {
            "upload_recent" => {
                let props: upload_recent::UploadRecentTaskProps = serde_json::from_str(&l)?;
                let res = upload_recent::upload_recent_task(props).await;
                if let Err(e) = res {
                    err_log = format!("Error executing upload_recent task: {}", e);
                    break;
                } else {
                    log += &res.unwrap();
                }
            }
            _ => {
                log::warn!("unknown cron task: {}", now_tasks);
            }
        }

    }
    Ok(format!("success: {}, error: {}", log, err_log))
}

pub mod upload_recent;