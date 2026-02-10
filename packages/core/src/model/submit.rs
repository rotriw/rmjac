use sea_orm::ColumnTrait;
use crate::Result;
use crate::graph::node::{Node, NodeRaw};
use crate::graph::node::problem::statement::ProblemStatementNode;
use crate::graph::node::record::{RecordNode, RecordStatus};
use crate::graph::node::user::remote_account::VjudgeNode;
use crate::model::ModelStore;
use crate::model::record::{Record, RecordFactory, RecordNewProp};
use crate::service::judge::service::{CompileOptionValue, LanguageChoiceInformation, SubmitContext, get_tool, StringOption};
use crate::workflow::vjudge::VjudgeWorkflowRegistry;
use std::collections::HashMap;
use crate::graph::edge::{EdgeQuery, EdgeRaw};
use crate::graph::edge::misc::{MiscEdgeQuery, MiscEdgeRaw};
use crate::graph::node::record::submit_info::{SubmitInfoNode, SubmitInfoNodePublic, SubmitInfoNodeRaw};

pub struct SubmissionService;

pub struct SubmissionMethod {
    pub platform: String,
    pub basic_option: HashMap<String, Box<dyn CompileOptionValue>>,
}

impl SubmissionMethod {

    pub async fn save(store: &mut impl ModelStore, statement_id: i64, default_judge_option: HashMap<String, String>) -> Result<()> {
        let submit_node = SubmitInfoNodeRaw {
            public: SubmitInfoNodePublic {
                default_judge_option
            },
            ..Default::default()
        }.save(store.get_db()).await?;

        MiscEdgeRaw {
            u: statement_id,
            v: submit_node.node_id,
            misc_type: "submit_option".to_string()
        }.save(store.get_db()).await?;
        Ok(())
    }

    pub async fn get(
        store: &mut impl ModelStore,
        statement_id: i64,
    ) -> Result<HashMap<String, Box<dyn CompileOptionValue>>> {
        let db = store.get_db().clone();
        use crate::db::entity::edge::misc::Column;
        let get_c = MiscEdgeQuery::get_v_filter(statement_id, Column::MiscType.eq("submit_option"), &db).await?;
        if get_c.is_empty() {
            return Ok(HashMap::new());
        }
        let submit_node = SubmitInfoNode::from_db(&db, get_c[0]).await?;
        log::info!("{:?}", submit_node);
        let mut result: HashMap<String, Box<dyn CompileOptionValue>> = HashMap::new();
        for (k, v) in submit_node.public.default_judge_option.iter() {
            result.insert(k.clone(), Box::new(StringOption { value: v.clone() }));
        }

        Ok(result)
    }
}

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
        let get_default_option = SubmissionMethod::get(store, statement_id).await?;
        let judge_option = judge_option
            .into_iter()
            .chain(get_default_option.into_iter())
            .collect::<HashMap<String, Box<dyn CompileOptionValue>>>();

        let statement_node = ProblemStatementNode::from_db(&db, statement_id).await?;
        let vjudge_node = VjudgeNode::from_db(&db, vjudge_id).await?;

        let judge_service = get_tool(&statement_node.public.source.clone().to_lowercase())?;

        let record_node = RecordFactory::create(
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
        let mut context = context;
        context.record_id = record_node.node_id;
        let method = context.method.clone();

        let option = judge_service.get_option(language, judge_option);
        let task = judge_service.convert_to_json(option, vjudge_node, context);
        let input: serde_json::Value = serde_json::from_str(&task).unwrap_or_else(|_| {
            serde_json::json!({
                "operation": "submit",
                "platform": statement_node.public.source.clone(),
                "method": method,
                "payload": task,
            })
        });

        let platform = statement_node.public.source.to_lowercase();
        let service_name = format!("{}:submit:{}", platform, method);
        let task_id = format!("vjudge-submit-{}", record_node.node_id);

        let workflow = VjudgeWorkflowRegistry::default();
        let response = workflow
            .dispatch_task(
                &task_id,
                &service_name,
                &platform,
                "submit",
                &method,
                input,
                None,
            )
            .await;
        if !response.success {
            log::debug!("Send Submit Task Failed: {:?}", response.error);
        }

        Ok(record_node)
    }

    pub async fn default_options(
        store: &mut impl ModelStore,
        statement_id: i64,
    ) -> Result<HashMap<String, Box<dyn CompileOptionValue>>> {
        let submit_options = SubmissionMethod::get(store, statement_id).await?;
        Ok(submit_options)
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
