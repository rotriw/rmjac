//! Database update services for VJudge workflow
//!
//! These services persist workflow results to the local database.

use workflow::description::WorkflowRequire;
use workflow::workflow::{Service, ServiceInfo, Status, StatusDescribe, StatusRequire, Value};
use workflow::value::{BaseValue, WorkflowValue};
use workflow::status::{WorkflowValues, WorkflowStatus};

use crate::env::db::get_connect;
use crate::model::problem::CreateProblemProps;
use crate::model::vjudge::{VjudgeAccount, VjudgeService};
use crate::model::problem::ProblemImport;
use crate::utils::get_redis_connection;

#[derive(Clone)]
pub struct UpdateProblemService;

impl UpdateProblemService {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait::async_trait(?Send)]
impl Service for UpdateProblemService {
    fn is_end(&self) -> bool {
        true
    }

    fn get_info(&self) -> ServiceInfo {
        ServiceInfo {
            name: "update_problem".to_string(),
            description: "Save problem to database".to_string(),
            allow_description: "Requires problem_data (CreateProblemProps JSON)".to_string(),
        }
    }

    fn get_cost(&self) -> i32 {
        5
    }

    fn get_import_require(&self) -> Box<dyn StatusRequire> {
        Box::new(WorkflowRequire::new().with_inner_key("problem_data"))
    }

    fn get_export_describe(&self) -> Vec<Box<dyn StatusDescribe>> { // 对于结束值，不需要导出描述。
        vec![]
    }

    async fn verify(&self, input: &WorkflowValues) -> bool {
        input.get_value("inner:problem_data").is_some()
    }

    async fn execute(&self, input: &WorkflowValues) -> WorkflowValues {
        let problem_raw = match input.get_value("problem_data") {
            Some(value) => value.to_string(),
            None => return Box::new(WorkflowStatus::failed("Missing problem_data")),
        };

        let problem: CreateProblemProps = match serde_json::from_str(&problem_raw) {
            Ok(problem) => problem,
            Err(err) => {
                return Box::new(WorkflowStatus::failed(format!(
                    "Invalid problem_data: {}",
                    err
                )))
            }
        };

        let db = match get_connect().await {
            Ok(db) => db,
            Err(err) => {
                return Box::new(WorkflowStatus::failed(format!(
                    "DB connect failed: {}",
                    err
                )))
            }
        };
        let mut redis = get_redis_connection();
        let mut store = (&db, &mut redis);

        if let Err(err) = VjudgeService::import_problem(&mut store, &problem).await {
            return Box::new(WorkflowStatus::failed(format!(
                "Import problem failed: {}",
                err
            )));
        }

        let local_problem_id = match ProblemImport::resolve(&mut store, &problem.problem_iden).await {
            Ok((problem_id, _)) => problem_id,
            Err(_) => -1,
        };

        Box::new(WorkflowStatus::task_done("Problem imported successfully"))
    }
}

#[derive(Clone)]
pub struct UpdateVerifiedService;

impl UpdateVerifiedService {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait::async_trait(?Send)]
impl Service for UpdateVerifiedService {
    fn is_end(&self) -> bool {
        true
    }

    fn get_info(&self) -> ServiceInfo {
        ServiceInfo {
            name: "update_verified".to_string(),
            description: "Update VJudge account verification status".to_string(),
            allow_description: "Requires account_id, verified".to_string(),
        }
    }

    fn get_cost(&self) -> i32 {
        1
    }

    fn get_import_require(&self) -> Box<dyn StatusRequire> {
        Box::new(WorkflowRequire::new().with_inner_key("vjudge_id"))
    }

    fn get_export_describe(&self) -> Vec<Box<dyn StatusDescribe>> {
        vec![]
    }

    async fn verify(&self, input: &Box<dyn Status>) -> bool {
        input.get_value("inner:account_id").is_some()
    }

    async fn execute(&self, input: &Box<dyn Status>) -> Box<dyn Status> {
        let account_id = match input.get_value("account_id") {
            Some(value) => value_as_i64(value),
            None => return Box::new(WorkflowStatus::failed("Invalid account_id")),
        };

        let verified = input
            .get_value("verified")
            .map(value_as_bool)
            .unwrap_or(true);

        if !verified {
            return Box::new(WorkflowStatus::failed("Verification failed"));
        }

        let db = match get_connect().await {
            Ok(db) => db,
            Err(err) => {
                return Box::new(WorkflowStatus::failed(format!(
                    "DB connect failed: {}",
                    err
                )))
            }
        };

        if let Err(err) = VjudgeAccount::new(account_id).set_verified(&db).await {
            return Box::new(WorkflowStatus::failed(format!(
                "Update verified failed: {}",
                err
            )));
        }

        Box::new(WorkflowValues::from_json_trusted(serde_json::json!({
            "account_id": account_id,
            "verified": true,
        }), "update_verified"))
    }
}

fn value_as_i64(value: Box<dyn Value>) -> i64 {
    let raw = value.to_string();
    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&raw) {
        if let Some(n) = parsed.as_i64() {
            return n;
        }
        if let Some(s) = parsed.as_str() {
            return s.parse::<i64>().unwrap_or(0);
        }
    }
    raw.parse::<i64>().unwrap_or(0)
}

fn value_as_bool(value: Box<dyn Value>) -> bool {
    let raw = value.to_string();
    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&raw) {
        if let Some(b) = parsed.as_bool() {
            return b;
        }
        if let Some(s) = parsed.as_str() {
            return s == "true";
        }
    }
    raw == "true"
}
