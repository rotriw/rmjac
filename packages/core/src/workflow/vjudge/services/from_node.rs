//! 此文件的方法均预期为起点。

use std::collections::HashMap;
use async_trait::async_trait;
use tap::Conv;
use workflow::status::{WorkflowStatus, WorkflowValues};
use workflow::value::WorkflowValue;
use workflow::workflow::{Service, ServiceInfo, Status, StatusDescribe, StatusRequire};
use crate::db::iden::node::user_remote::Vjudge;
use crate::env::db::get_connect;
use crate::graph::node::Node;
use crate::graph::node::user::remote_account::{RemoteMode, VjudgeAuth, VjudgeNode};
use crate::model::user::UserAuthService;
use crate::model::vjudge::VjudgeAccount;
use crate::workflow::vjudge::status::{VjudgeExportDescribe, VjudgeExportDescribeExpr, VjudgeRequire, VjudgeRequireExpr};

#[derive(Clone)]
pub struct FromNodeService {
    mode: RemoteMode
}


impl Default for FromNodeService {
    fn default() -> Self {
        Self {
            mode: RemoteMode::Token
        }
    }
}

impl FromNodeService {
    pub fn new(mode: RemoteMode) -> Self {
        Self {
            mode
        }
    }
}

#[async_trait(?Send)]
impl Service for FromNodeService {
    fn is_end(&self) -> bool {
        false
    }

    fn get_info(&self) -> ServiceInfo {
        ServiceInfo {
            name: "from_node".to_string(),
            description: format!("Start from Node with mode {}", self.mode.clone().conv::<String>()),
            allow_description: "No input required".to_string(),
        }
    }

    fn get_cost(&self) -> i32 {
        1
    }

    fn get_import_require(&self) -> Box<dyn StatusRequire> {
        Box::new(
            VjudgeRequire {
                inner: vec![
                    VjudgeRequireExpr::HasKey("vjudge_id".to_string()),
                    VjudgeRequireExpr::HasKey("user_id".to_string()),
                    VjudgeRequireExpr::HasKey("token".to_string())
                ]
            }
        )
    }

    fn get_export_describe(&self) -> Vec<Box<dyn StatusDescribe>> {
        let mut inner = HashMap::new();
        inner.insert("node_id".to_string(), vec![VjudgeExportDescribeExpr::Has]);
        inner.insert("handle".to_string(), vec![VjudgeExportDescribeExpr::Has]);
        inner.insert("platform".to_string(), vec![VjudgeExportDescribeExpr::Has]);
        match &self.mode {
            RemoteMode::Apikey => {
                inner.insert("api_key".to_string(), vec![VjudgeExportDescribeExpr::Has]);
                inner.insert("api_secret".to_string(), vec![VjudgeExportDescribeExpr::Has]);
            }
            RemoteMode::Token => {
                inner.insert("token".to_string(), vec![VjudgeExportDescribeExpr::Has]);
            }
            RemoteMode::OnlyTrust => {
                inner.insert("verified_code".to_string(), vec![VjudgeExportDescribeExpr::Has]);
            }
            _ => {}
        }
        vec![Box::new(
            VjudgeExportDescribe {
                inner: vec![inner]
            }
        )]
    }

    async fn verify(&self, input: &Box<dyn Status>) -> bool {
        let id = input.get_value("vjudge_id");
        if id.is_none() {
            return false;
        }
        let id = id.unwrap().to_string().parse::<i64>();
        if id.is_err() {
            return false;
        }
        let vjudge_id = id.unwrap();
        let id = input.get_value("user_id");
        if id.is_none() {
            return false;
        }
        let id = id.unwrap().to_string().parse::<i64>();
        if id.is_err() {
            return false;
        }
        let user_id = id.unwrap();
        let token = input.get_value("token");
        if token.is_none() {
            return false;
        }
        let token = token.unwrap().to_string();
        if !UserAuthService::check_token(user_id, &token).await {
            return false;
        }
        let db = get_connect().await.unwrap();
        if VjudgeAccount::new(vjudge_id).owned_by(&db, user_id).await.unwrap_or(false) ||  VjudgeAccount::can_manage(user_id) {
            return true;
        }
        false
    }

    async fn execute(&self, input: &Box<dyn Status>) -> Box<dyn Status> {
        let db = get_connect().await.unwrap();
        let vjudge_id = input.get_value("vjudge_id").unwrap().to_string().parse::<i64>().unwrap();
        let data = VjudgeNode::from_db(&db, vjudge_id).await;
        if data.is_err() {
            return Box::new(
                WorkflowStatus::failed(format!("Failed to get VjudgeNode: {}", data.err().unwrap()))
            );
        }
        let vjudge_node = data.unwrap();
        let public = &vjudge_node.public;
        let mut res = WorkflowValues::new();
        res.add_trusted("node_id", vjudge_node.node_id.into(), "from_node");
        res.add_trusted("handle", vjudge_node.public.iden.clone().into(), "from_node");
        match &self.mode {
            RemoteMode::Apikey => {
                use crate::graph::node::user::remote_account::VjudgeAuth;
                let token = vjudge_node.private.auth.unwrap().clone();
                if let VjudgeAuth::Token(total) = token {
                    let (api_key, api_secret) = total.split_once(':').unwrap_or(("", ""));
                    res.add_trusted("api_key", api_key.to_string().into(), "from_node");
                    res.add_trusted("api_secret", api_secret.to_string().into(), "from_node");
                }
            }
            RemoteMode::Token => {
                let token = vjudge_node.private.auth.unwrap().clone();
                if let VjudgeAuth::Token(total) = token {
                    res.add_trusted("token", total.into(), "from_node");
                }
            }
            RemoteMode::Password => {
                let password = vjudge_node.private.auth.unwrap().clone();
                if let VjudgeAuth::Password(total) = password {
                    res.add_trusted("password", total.into(), "from_node");
                }
            }
            RemoteMode::OnlyTrust => {
                let verified = vjudge_node.public.verified_code;
                res.add_trusted("verified_code", verified.into(), "from_node");
            }
        };

        Box::new(WorkflowStatus::running(res))
    }
}