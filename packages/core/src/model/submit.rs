use std::collections::HashMap;
use sea_orm::DatabaseConnection;
use crate::graph::node::Node;
use crate::graph::node::problem::statement::ProblemStatementNode;
use crate::graph::node::record::{RecordNode, RecordStatus};
use crate::graph::node::user::remote_account::VjudgeNode;
use crate::model::record::{create_record_with_status, update_record_message, update_record_root_status, RecordNewProp, UpdateRecordRootStatusData};
use crate::Result;
use crate::service::judge::service::{get_tool, SubmitContext};
use crate::service::socket::service::add_task;
use crate::utils::get_redis_connection;

pub async fn submit_vjudge_code(db: &DatabaseConnection, statement_id: i64, user_id: i64, vjudge_id: i64, code: &str, judge_option: HashMap<String, String>, public_view: bool) -> Result<RecordNode> {
    let statement_node = ProblemStatementNode::from_db(db, statement_id).await?;
    let vjudge_node = VjudgeNode::from_db(db, vjudge_id).await?;
    let judge_service = get_tool(&statement_node.public.source.clone().to_lowercase())?;
    let record_node = create_record_with_status(db, RecordNewProp {
        platform: statement_node.public.source.clone(),
        code_language: "".to_string(),
        code: code.to_string(),
        url: "[no-fetch]".to_string(),
        statement_node_id: statement_id,
        public_status: public_view
    }, user_id, RecordStatus::Waiting, 0, now_time!()).await?;
    // judge_ser
    // 然后是找edge_server测评。
    // let redis_conn = get_redis_connection().await?;
    Ok(record_node)
}
