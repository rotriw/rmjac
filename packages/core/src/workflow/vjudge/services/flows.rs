//! Flow end services for VJudge workflow
//!
//! register_account / submit_problem / sync_problem

use async_trait::async_trait;
use workflow::description::{WorkflowExportDescribe, WorkflowRequire};
use workflow::status::{WorkflowStatus, WorkflowValues};
use workflow::workflow::{Service, ServiceInfo, StatusDescribe, StatusRequire};
use workflow::value::BaseValue;


/// 账号注册流程（终点）
///
/// 输入：platform / method / username / auth / user_id / verified_account
/// 输出：task_done
#[derive(Clone, Default)]
pub struct RegisterAccountFlow;

impl RegisterAccountFlow {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait(?Send)]
impl Service for RegisterAccountFlow {
    fn is_end(&self) -> bool {
        true
    }

    fn get_info(&self) -> ServiceInfo {
        ServiceInfo {
            name: "register_account".to_string(),
            description: "Register VJudge account and ensure verification".to_string(),
            allow_description: "Requires platform, method, username/auth, verified account, and user_id".to_string(),
        }
    }

    fn get_cost(&self) -> i32 {
        1
    }

    fn get_import_require(&self) -> Box<dyn StatusRequire> {
        Box::new(
            WorkflowRequire::new()
                .with_inner_key("platform")
                .with_inner_key("method")
                .with_inner_key("username")
                .with_inner_key("verified")
                .with_inner_key("user_id"),
        )
    }

    fn get_export_describe(&self) -> Vec<Box<dyn StatusDescribe>> {
        vec![Box::new(WorkflowExportDescribe::new().add_has("task_done"))]
    }

    async fn verify(&self, input: &WorkflowValues) -> bool {
        input.get_value("platform").is_some()
            && input.get_value("method").is_some()
            && input.get_value("username").is_some()
            && input.get_value("inner:verified").is_some()
            && input.get_value("inner:user_id").is_some()
    }

    async fn execute(&self, input: &WorkflowValues) -> WorkflowValues {
        let platform = input.get_value("platform").map(|v| v.to_string()).unwrap_or_default();
        let method = input.get_value("method").map(|v| v.to_string()).unwrap_or_default();
        let username = input.get_value("username").map(|v| v.to_string()).unwrap_or_default();

        let mut values = WorkflowValues::new();
        values.add_trusted("platform", BaseValue::String(platform.clone()), "register_account");
        values.add_trusted("method", BaseValue::String(method.clone()), "register_account");
        values.add_trusted("username", BaseValue::String(username.clone()), "register_account");
        values.add_trusted("verified_account", BaseValue::Bool(true), "register_account");
        WorkflowValues::final_status(WorkflowStatus::completed(
            values,
            Some(format!(
                "register_account done: platform={}, method={}, username={}",
                platform, method, username
            )),
        ))
    }
}

/// 提交题目流程（终点）
///
/// 输入：platform / method / record_id / vjudge_account_id / code / language
/// 输出：task_done
#[derive(Clone, Default)]
pub struct SubmitProblemFlow;

impl SubmitProblemFlow {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait(?Send)]
impl Service for SubmitProblemFlow {
    fn is_end(&self) -> bool {
        true
    }

    fn get_info(&self) -> ServiceInfo {
        ServiceInfo {
            name: "submit_problem".to_string(),
            description: "Submit problem to remote judge".to_string(),
            allow_description: "Requires platform, method, record_id, vjudge_account_id, code, language".to_string(),
        }
    }

    fn get_cost(&self) -> i32 {
        1
    }

    fn get_import_require(&self) -> Box<dyn StatusRequire> {
        Box::new(
            WorkflowRequire::new()
                .with_inner_key("submissions"),
        )
    }

    fn get_export_describe(&self) -> Vec<Box<dyn StatusDescribe>> {
        vec![Box::new(WorkflowExportDescribe::new().add_has("task_done"))]
    }

    async fn verify(&self, input: &WorkflowValues) -> bool {
        input.get_inner("submissions").is_some()
    }

    async fn execute(&self, input: &WorkflowValues) -> WorkflowValues {
        let platform = input.get_value("platform").map(|v| v.to_string()).unwrap_or_default();
        let method = input.get_value("method").map(|v| v.to_string()).unwrap_or_default();
        let record_id = input.get_value("record_id").map(|v| v.to_string()).unwrap_or_default();

        let mut values = WorkflowValues::new();
        values.add_trusted("platform", BaseValue::String(platform.clone()), "submit_problem");
        values.add_trusted("method", BaseValue::String(method.clone()), "submit_problem");
        values.add_trusted("record_id", BaseValue::String(record_id.clone()), "submit_problem");

        WorkflowValues::final_status(WorkflowStatus::completed(
            values,
            Some(format!(
                "submit_problem done: platform={}, method={}, record_id={}",
                platform, method, record_id
            )),
        ))
    }
}

/// 同步题目提交流程（终点）
///
/// 输入：platform / method / vjudge_node / user_id / range
/// 输出：task_done
#[derive(Clone, Default)]
pub struct SyncProblemFlow;

impl SyncProblemFlow {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait(?Send)]
impl Service for SyncProblemFlow {
    fn is_end(&self) -> bool {
        true
    }

    fn get_info(&self) -> ServiceInfo {
        ServiceInfo {
            name: "sync_problem".to_string(),
            description: "Sync problem submissions from remote judge".to_string(),
            allow_description: "Requires platform, method, vjudge_node, user_id, range".to_string(),
        }
    }

    fn get_cost(&self) -> i32 {
        1
    }

    fn get_import_require(&self) -> Box<dyn StatusRequire> {
        Box::new(
            WorkflowRequire::new()
                .with_inner_key("submissions"),
        )
    }

    fn get_export_describe(&self) -> Vec<Box<dyn StatusDescribe>> {
        vec![Box::new(WorkflowExportDescribe::new().add_has("task_done"))]
    }

    async fn verify(&self, input: &WorkflowValues) -> bool {
        input.get_value("submissions").is_some()
    }

    async fn execute(&self, input: &WorkflowValues) -> WorkflowValues {
        let platform = input.get_value("platform").map(|v| v.to_string()).unwrap_or_default();
        let method = input.get_value("method").map(|v| v.to_string()).unwrap_or_default();
        let range = input.get_value("range").map(|v| v.to_string()).unwrap_or_default();

        let mut values = WorkflowValues::new();
        values.add_trusted("platform", BaseValue::String(platform.clone()), "sync_problem");
        values.add_trusted("method", BaseValue::String(method.clone()), "sync_problem");
        values.add_trusted("range", BaseValue::String(range.clone()), "sync_problem");

        WorkflowValues::final_status(WorkflowStatus::completed(
            values,
            Some(format!(
                "sync_problem done: platform={}, method={}, range={}",
                platform, method, range
            )),
        ))
    }
}
