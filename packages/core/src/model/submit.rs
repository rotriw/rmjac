use sea_orm::DatabaseConnection;
use crate::graph::node::Node;
use crate::graph::node::problem::statement::ProblemStatementNode;
use crate::graph::node::record::{RecordNode, RecordStatus};
use crate::graph::node::user::remote_account::VjudgeNode;
use crate::model::record::{create_record_with_status, update_record_message, update_record_root_status, RecordNewProp, UpdateRecordRootStatusData};
use crate::Result;
use crate::service::judge::service::add_task;
use crate::utils::get_redis_connection;

pub async fn submit_vjudge_code(db: &DatabaseConnection, statement_id: i64, user_id: i64, vjudge_id: i64, code: &str, language: &str, public_view: bool) -> Result<RecordNode> {
    let statement_node = ProblemStatementNode::from_db(db, statement_id).await?;
    let vjudge_node = VjudgeNode::from_db(db, vjudge_id).await?;
    let record_node = create_record_with_status(db, RecordNewProp {
        platform: statement_node.public.source.clone(),
        code_language: language.to_string(),
        code: code.to_string(),
        url: "[no-fetch]".to_string(),
        statement_node_id: statement_id,
        public_status: public_view
    }, user_id, RecordStatus::Waiting, 0, now_time!()).await?;
    // 然后是找edge_server测评。

    let result = add_task(&Json!{
        "operation": "submit",
        "platform": statement_node.public.source,
        "vjudge_node": vjudge_node,
        "code": code,
        "language": language,
    }).await;

    if !result {
        let mut now_wait_sec = 10;
        let mut retry_result = false;
        for attempts in 1..3 {
            log::error!("Failed to submit code to edge server for submission {}, edge_server failed. retry after {now_wait_sec}s({attempts}/5).", &record_node.node_id);
            tokio::time::sleep(std::time::Duration::from_secs(now_wait_sec)).await;
            let result = add_task(&Json!{
                "operation": "submit",
                "platform": statement_node.public.source,
                "vjudge_node": vjudge_node,
                "code": code,
                "language": language,
            }).await;
            now_wait_sec += 5;
            if result {
                retry_result = true;
                break;
            }
        }
        if !retry_result {
            let mut redis = get_redis_connection();
            log::error!("All retries to submit code to edge server for submission {} failed.", &record_node.node_id);
            let _ = update_record_root_status(db, &mut redis, UpdateRecordRootStatusData {
                record_id: record_node.node_id,
                time: -1,
                memory: -1,
                status: RecordStatus::RemoteServiceUnknownError,
                score: -1,
            }).await;
            let _ = update_record_message(db, record_node.node_id, Some("Edge server connection failed after retried 3 times.".to_string())).await;
            return Ok(record_node);
        }
    }
    Ok(record_node)
}
