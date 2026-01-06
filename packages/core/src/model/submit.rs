use std::collections::HashMap;
use sea_orm::DatabaseConnection;
use crate::graph::node::Node;
use crate::graph::node::problem::statement::ProblemStatementNode;
use crate::graph::node::record::{RecordNode, RecordStatus};
use crate::graph::node::user::remote_account::VjudgeNode;
use crate::model::record::{create_record_with_status, update_record_message, update_record_root_status, RecordNewProp, UpdateRecordRootStatusData};
use crate::Result;
use crate::service::judge::service::{get_tool, CompileOptionValue, LanguageChoiceInformation, SubmitContext};
use crate::service::socket::service::add_task;
use crate::utils::get_redis_connection;

pub async fn submit_vjudge_code(db: &DatabaseConnection, statement_id: i64, user_id: i64, vjudge_id: i64, code: &str, language: &str, judge_option: HashMap<String, Box<dyn CompileOptionValue>>, context: SubmitContext, public_view: bool) -> Result<RecordNode> {
    let statement_node = ProblemStatementNode::from_db(db, statement_id).await?;
    let vjudge_node = VjudgeNode::from_db(db, vjudge_id).await?;
    let judge_service = get_tool(&statement_node.public.source.clone().to_lowercase())?;
    let record_node = create_record_with_status(db, RecordNewProp {
        platform: statement_node.public.source.clone(),
        code_language: language.to_string(),
        code: code.to_string(),
        url: "[no-fetch]".to_string(),
        statement_node_id: statement_id,
        public_status: public_view
    }, user_id, RecordStatus::Waiting, 0, now_time!()).await?;
    // judge_ser
    let option = judge_service.get_option(language, judge_option);
    let task = judge_service.convert_to_json(option, vjudge_node, context);
    let mut is_send = false;
    for i in 0..3 {
        let result = add_task(&task).await;
        if result == true {
            is_send = true;
            break;
        }
    }
    if is_send == false {
        log::debug!("Send Submit Task Failed: {:?}", task);
    }

    Ok(record_node)
}

pub async fn get_allowed_method(db: &DatabaseConnection, platform: &str) -> Result<Vec<LanguageChoiceInformation>> {
    let judge_service = get_tool(&platform.to_lowercase())?;
    Ok(judge_service.get_compile_option().export_all_allowed_language())
}