use crate::Result;
use crate::graph::node::Node;
use crate::graph::node::problem::statement::ProblemStatementNode;
use crate::graph::node::record::{RecordNode, RecordStatus};
use crate::graph::node::user::remote_account::VjudgeNode;
use crate::model::ModelStore;
use crate::model::record::{Record, RecordNewProp};
use crate::service::judge::service::{
    CompileOptionValue, LanguageChoiceInformation, SubmitContext, get_tool,
};
use crate::service::socket::service::add_task;
use std::collections::HashMap;

pub struct SubmissionService;

impl SubmissionService {
    pub async fn submit(
        store: &mut impl ModelStore,
        statement_id: i64,
        user_id: i64,
        vjudge_id: i64,
        code: &str,
        language: &str,
        judge_option: HashMap<String, Box<dyn CompileOptionValue>>,
        context: SubmitContext,
        public_view: bool,
    ) -> Result<RecordNode> {
        let db = store.get_db().clone();

        let statement_node = ProblemStatementNode::from_db(&db, statement_id).await?;
        let vjudge_node = VjudgeNode::from_db(&db, vjudge_id).await?;

        let judge_service = get_tool(&statement_node.public.source.clone().to_lowercase())?;

        let record_node = Record::create(
            &db,
            RecordNewProp {
                platform: statement_node.public.source.clone(),
                code_language: language.to_string(),
                code: code.to_string(),
                url: "[no-fetch]".to_string(),
                statement_node_id: statement_id,
                public_status: public_view,
            },
            user_id,
            RecordStatus::Waiting,
            0,
            chrono::Utc::now().naive_utc(),
        )
        .await?;

        let option = judge_service.get_option(language, judge_option);
        let task = judge_service.convert_to_json(option, vjudge_node, context);

        let mut is_send = false;
        for _ in 0..3 {
            let result = add_task(&task).await;
            if result {
                is_send = true;
                break;
            }
        }
        if !is_send {
            log::debug!("Send Submit Task Failed: {:?}", task);
        }

        Ok(record_node)
    }

    pub async fn allowed_methods(
        _store: &impl ModelStore,
        platform: &str,
    ) -> Result<Vec<LanguageChoiceInformation>> {
        let judge_service = get_tool(&platform.to_lowercase())?;
        Ok(judge_service
            .get_compile_option()
            .export_all_allowed_language())
    }
}
