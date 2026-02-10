use async_trait::async_trait;
use workflow::description::WorkflowRequire;
use workflow::status::{WorkflowStatus, WorkflowValues};
use workflow::workflow::{Service, ServiceInfo, Status, StatusDescribe, StatusRequire};
use crate::env::db::get_connect;
use crate::graph::node::user::remote_account::{RemoteMode, VjudgeAuth};
use crate::model::vjudge::VjudgeAccount;

#[derive(Clone, Default)]
pub struct RegisterUserService;

impl RegisterUserService {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait(?Send)]
impl Service for RegisterUserService {
    fn is_end(&self) -> bool {
        true
    }

    fn get_info(&self) -> ServiceInfo {
        ServiceInfo {
            name: "register_user".to_string(),
            description: "Register a new user account on VJudge".to_string(),
            allow_description: "Requires platform, username, password, email. must be verified.".to_string(),
        }
    }

    fn get_cost(&self) -> i32 {
        1
    }

    fn get_import_require(&self) -> Box<dyn StatusRequire> {
        Box::new(
            WorkflowRequire::new()
                .with_key("platform")
                .with_key("username")
                .with_key("password")
                .with_key("method")
                .with_inner_key("verified_account")
                .with_inner_key("user_id"),
        )
    }

    fn get_export_describe(&self) -> Vec<Box<dyn StatusDescribe>> { // 无需描述。但其实会 export 值。
        vec![]
    }

    async fn verify(&self, input: &Box<dyn Status>) -> bool {
        if input.get_value("inner:verified_account").is_none() {
            return false;
        }
        input.get_value("platform").is_some()
        && input.get_value("username").is_some()
        && input.get_value("auth").is_some()
        && input.get_value("inner:user_id").is_some()
    }

    async fn execute(&self, input: &Box<dyn Status>) -> Box<dyn Status> {
        // to register account.
        let platform = input.get_value("platform").unwrap().to_string();
        let username = input.get_value("username").unwrap().to_string();
        let auth = input.get_value("auth").unwrap().to_string();
        let method = input.get_value("method").unwrap().to_string();
        let user_id = input.get_value("inner:user_id").unwrap().to_string().parse::<i64>().unwrap();
        let db = get_connect().await.unwrap();
        let auth = if method == "password" {
            Some(VjudgeAuth::Password(auth))
        } else if method == "token" || method == "apikey" {
            Some(VjudgeAuth::Token(auth))
        } else {
            None
        };
        let w = VjudgeAccount::create(&db, user_id, username, platform, RemoteMode::from(method), auth, true, None, false).await;
        if w.is_err() {
            log::info!("Failed to register user.");
            return Box::new(WorkflowStatus::failed("Failed to register user".to_string()));
        }
        let w = w.ok().unwrap();
        Box::new(WorkflowStatus::completed(WorkflowValues::from_json_untrusted(serde_json::json!({
            "node_id": w.node_id,
        })), Some("User registered successfully".to_string())))
    }

}
