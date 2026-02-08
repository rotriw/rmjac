//! Verify Account Service
//!
//! This service verifies that the remote account is valid and accessible.

use workflow::workflow::{Service, ServiceInfo, Status, StatusDescribe, StatusRequire};
use crate::workflow::vjudge::status::{
    VjudgeStatus, VjudgeStatusDescribe, VjudgeStatusRequire, VjudgeStatusType,
};

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
            VjudgeStatusRequire::new()
                .with_status_type(VjudgeStatusType::Initial)
                .with_required_key("platform")
                .with_required_key("account_id"),
        )
    }

    fn get_export_describe(&self) -> Vec<Box<dyn StatusDescribe>> {
        vec![
            Box::new(
                VjudgeStatusDescribe::new(VjudgeStatusType::AccountVerified)
                    .with_key("platform")
                    .with_key("account_id")
                    .with_key("account_verified"),
            ),
            Box::new(
                VjudgeStatusDescribe::new(VjudgeStatusType::Error)
                    .with_key("error"),
            ),
        ]
    }

    async fn verify(&self, input: &Box<dyn Status>) -> bool {
        // Check if the input has the required platform and it matches our platform
        if let Some(platform_value) = input.get_value("platform") {
            let platform = platform_value.to_string();
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
            .map(|v| v.to_string())
            .unwrap_or_default();
        let remote_problem_id = input
            .get_value("remote_problem_id")
            .map(|v| v.to_string());
        let account_id = input
            .get_value("account_id")
            .and_then(|v| v.to_string().parse::<i64>().ok());

        // In a real implementation, this would call the edge service to verify
        // For now, we just transition the status
        let mut status = VjudgeStatus::new_initial(
            &platform,
            remote_problem_id.as_deref().unwrap_or(""),
        );

        if let Some(aid) = account_id {
            // TODO: Actually verify the account via edge service
            // For now, assume success
            status = status.with_account_verified(aid);
            Box::new(status)
        } else {
            Box::new(VjudgeStatus::new_error("No account_id provided"))
        }
    }
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
