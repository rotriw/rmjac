//! Database update services for VJudge workflow
//!
//! These services persist workflow results to the local database.

use std::collections::HashMap;
use serde_json::Value::Object;
use workflow::workflow::{Service, ServiceInfo, Status, StatusDescribe, StatusRequire};

use crate::env::db::get_connect;
use crate::model::problem::CreateProblemProps;
use crate::model::vjudge::{VjudgeAccount, VjudgeService};
use crate::model::problem::ProblemImport;
use crate::utils::get_redis_connection;
use crate::workflow::vjudge::status::{VjudgeExportDescribeExpr, VjudgeRequire, VjudgeRequireExpr, VjudgeStatus};

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
        Box::new(
            VjudgeRequire {
                inner: vec![
                    VjudgeRequireExpr::Inner("problem_data".to_string()),
                ]
            }
        )
    }

    fn get_export_describe(&self) -> Vec<Box<dyn StatusDescribe>> { // 对于结束值，不需要导出描述。
        vec![]
    }

    async fn verify(&self, input: &Box<dyn Status>) -> bool {
        input.get_value(format!("inner:problem_data").as_str()).is_some()
    }

    async fn execute(&self, input: &Box<dyn Status>) -> Box<dyn Status> {
        let problem_raw = match input.get_value("problem_data") {
            Some(value) => value.to_string(),
            None => return Box::new(VjudgeStatus::Error("Missing problem_data".to_string())),
        };

        let problem: CreateProblemProps = match serde_json::from_str(&problem_raw) {
            Ok(problem) => problem,
            Err(err) => {
                return Box::new(VjudgeStatus::Error(format!(
                    "Invalid problem_data: {}",
                    err
                )))
            }
        };

        let db = match get_connect().await {
            Ok(db) => db,
            Err(err) => {
                return Box::new(VjudgeStatus::Error(format!(
                    "DB connect failed: {}",
                    err
                )))
            }
        };
        let mut redis = get_redis_connection();
        let mut store = (&db, &mut redis);

        if let Err(err) = VjudgeService::import_problem(&mut store, &problem).await {
            return Box::new(VjudgeStatus::Error(format!(
                "Import problem failed: {}",
                err
            )));
        }

        let local_problem_id = match ProblemImport::resolve(&mut store, &problem.problem_iden).await {
            Ok((problem_id, _)) => problem_id,
            Err(_) => -1,
        };

        Box::new(VjudgeStatus::TaskDone("Problem imported successfully".to_string()))
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
        Box::new(
            VjudgeStatusRequire::new()
                .with_status_type(VjudgeStatusType::AccountVerified)
                .with_required_key("account_id"),
        )
    }

    fn get_export_describe(&self) -> Vec<Box<dyn StatusDescribe>> {
        vec![Box::new(
            VjudgeStatusDescribe::new(VjudgeStatusType::Completed)
                .with_key("account_id")
                .with_key("verified"),
        )]
    }

    async fn verify(&self, input: &Box<dyn Status>) -> bool {
        input.get_status_type() == VjudgeStatusType::AccountVerified.as_str()
            && input.get_value("account_id").is_some()
    }

    async fn execute(&self, input: &Box<dyn Status>) -> Box<dyn Status> {
        let account_id = match input
            .get_value("account_id")
            .and_then(|v| v.to_string().parse::<i64>().ok())
        {
            Some(id) => id,
            None => return Box::new(VjudgeStatus::new_error("Invalid account_id")),
        };

        let verified = input
            .get_value("verified")
            .map(|v| v.to_string() == "true")
            .unwrap_or(true);

        if !verified {
            return Box::new(VjudgeStatus::new_error("Verification failed"));
        }

        let db = match get_connect().await {
            Ok(db) => db,
            Err(err) => {
                return Box::new(VjudgeStatus::new_error(&format!(
                    "DB connect failed: {}",
                    err
                )))
            }
        };

        if let Err(err) = VjudgeAccount::new(account_id).set_verified(&db).await {
            return Box::new(VjudgeStatus::new_error(&format!(
                "Update verified failed: {}",
                err
            )));
        }

        Box::new(
            VjudgeStatus::new(VjudgeStatusType::Completed)
                .with_value("account_id", VjudgeValue::Number(account_id))
                .with_value("verified", VjudgeValue::Bool(true)),
        )
    }
}
