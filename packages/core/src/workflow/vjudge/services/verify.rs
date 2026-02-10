//! Verify Account Service
//!
//! This service verifies that the remote account is valid and accessible.

use workflow::description::{WorkflowExportDescribe, WorkflowRequire};
use workflow::workflow::{Service, ServiceInfo, Status, StatusDescribe, StatusRequire, Value};
use workflow::value::{BaseValue, WorkflowValue};
use workflow::status::{WorkflowValues, WorkflowStatus};

/// Service to verify remote account credentials
#[derive(Clone)]
pub struct VerifyAccountService {
    /// Platform this service handles
    platform: String,
}

impl VerifyAccountService {
    /// Create a new verify account service for a specific platform
    pub fn new(platform: &str) -> Self {
        Self {
            platform: platform.to_string(),
        }
    }
}

#[async_trait::async_trait(?Send)]
impl Service for VerifyAccountService {
    fn is_end(&self) -> bool {
        false
    }

    fn get_info(&self) -> ServiceInfo {
        ServiceInfo {
            name: format!("verify_account_{}", self.platform),
            description: format!("Verify account credentials for {}", self.platform),
            allow_description: format!("Verifies that the configured account for {} is valid and can be used for operations", self.platform),
        }
    }

    fn get_cost(&self) -> i32 {
        10 // Low cost, just verification
    }

    fn get_import_require(&self) -> Box<dyn StatusRequire> {
        Box::new(
            WorkflowRequire::new()
                .with_key("platform")
                .with_key("account_id")
                .with_value("platform", self.platform.clone()),
        )
    }

    fn get_export_describe(&self) -> Vec<Box<dyn StatusDescribe>> {
        vec![Box::new(
            WorkflowExportDescribe::new()
                .add_has("platform")
                .add_has("account_id")
                .add_has("account_verified"),
        )]
    }

    async fn verify(&self, input: &Box<dyn Status>) -> bool {
        // Check if the input has the required platform and it matches our platform
        if let Some(platform_value) = input.get_value("platform") {
            let platform = value_as_string(platform_value);
            if platform != self.platform {
                return false;
            }
        } else {
            return false;
        }

        // Check if account_id is present
        input.get_value("account_id").is_some()
    }

    async fn execute(&self, input: &Box<dyn Status>) -> Box<dyn Status> {
        // Extract values from input
        let platform = input
            .get_value("platform")
            .map(value_as_string)
            .unwrap_or_default();
        let remote_problem_id = input
            .get_value("remote_problem_id")
            .map(value_as_string);
        let account_id = input
            .get_value("account_id")
            .map(value_as_i64);

        // In a real implementation, this would call the edge service to verify
        // For now, we just transition the status
        if let Some(aid) = account_id {
            let mut output = serde_json::json!({
                "platform": platform,
                "account_id": aid,
                "account_verified": true,
            });
            if let Some(remote_problem_id) = remote_problem_id {
                if let Some(obj) = output.as_object_mut() {
                    obj.insert(
                        "remote_problem_id".to_string(),
                        serde_json::Value::String(remote_problem_id),
                    );
                }
            }
            Box::new(WorkflowValues::from_json_trusted(output, "verify_account"))
        } else {
            Box::new(WorkflowStatus::failed("No account_id provided"))
        }
    }
}

fn value_as_string(value: Box<dyn Value>) -> String {
    let raw = value.to_string();
    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&raw) {
        match parsed {
            serde_json::Value::String(s) => s,
            serde_json::Value::Number(n) => n.to_string(),
            serde_json::Value::Bool(b) => b.to_string(),
            other => other.to_string(),
        }
    } else {
        raw
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

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_verify_service_info() {
        let service = VerifyAccountService::new("codeforces");
        let info = service.get_info();
        assert_eq!(info.name, "verify_account_codeforces");
    }

    #[tokio::test]
    async fn test_verify_service_not_end() {
        let service = VerifyAccountService::new("codeforces");
        assert!(!service.is_end());
    }
}
