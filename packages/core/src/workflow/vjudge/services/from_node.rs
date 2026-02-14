//! 此文件的方法均预期为起点。

use std::collections::HashMap;
use async_trait::async_trait;
use pgp::crypto::aes_kw::unwrap;
use tap::Conv;
use workflow::description::{WorkflowExportDescribe, WorkflowRequire};
use workflow::status::{WorkflowStatus, WorkflowValues};
use workflow::value::{BaseValue, WorkflowValue};
use workflow::workflow::{Service, ServiceInfo, Status, StatusDescribe, StatusRequire};
use crate::db::iden::node::user_remote::Vjudge;
use crate::env::db::get_connect;
use crate::graph::node::Node;
use crate::graph::node::user::remote_account::{RemoteMode, VjudgeAuth, VjudgeNode};
use crate::model::user::UserAuthService;
use crate::model::vjudge::VjudgeAccount;

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
            name: format!("vjudge_from_node_{}", self.mode.clone().conv::<String>()),
            description: format!("Start from Node with mode {}", self.mode.clone().conv::<String>()),
            allow_description: "No input required".to_string(),
        }
    }

    fn get_cost(&self) -> i32 {
        1
    }

    fn get_import_require(&self) -> Box<dyn StatusRequire> {
        Box::new(
            WorkflowRequire::new()
                .with_key("vjudge_id")
                .with_key("user_id")
                .with_key("token"),
        )
    }

    fn get_export_describe(&self) -> Vec<Box<dyn StatusDescribe>> {
        let mut describe = WorkflowExportDescribe::new()
            .add_inner_has("node_id")
            .add_inner_has("handle")
            .add_inner_has("platform");
        match &self.mode {
            RemoteMode::Apikey => {
                describe = describe.add_inner_has("api_key").add_inner_has("api_secret");
            }
            RemoteMode::Token => {
                describe = describe.add_inner_has("token");
            }
            RemoteMode::OnlyTrust => {
                describe = describe.add_inner_has("verified_code");
            }
            _ => {}
        }
        vec![Box::new(describe)]
    }

    async fn verify(&self, input: &WorkflowValues) -> bool {
        log::info!("Verifying FromNodeService with mode {:?}", self.mode);
        let ls = input.get_all_value();
        for (k, v) in &ls {
            log::info!("Input key: {}, value: {:?}", k, v.to_string());
        }
        let id = input.get_value("vjudge_id");
        if id.is_none() {
            log::info!("No vjudge_id given");
            return false;
        }
        let id = id.unwrap().to_string().parse::<i64>();
        if id.is_err() {
            log::info!("Unable to parse vjudge_id");
            return false;
        }
        let vjudge_id = id.unwrap();
        let id = input.get_value("user_id");
        if id.is_none() {
            log::info!("No user_id given");
            return false;
        }
        let id = id.unwrap().to_string().parse::<i64>();
        if id.is_err() {
            log::info!("Unable to parse user_id");
            return false;
        }
        let user_id = id.unwrap();
        let token = input.get_value("token");
        if token.is_none() {
            return false;
        }
        let token = token.unwrap().to_string();
        log::info!("Verifying FromNodeService with token {:?}", token);
        if !UserAuthService::check_token(user_id, &token).await {
            return false;
        }
        let db = get_connect().await.unwrap();
        if VjudgeAccount::new(vjudge_id).owned_by(&db, user_id).await.unwrap_or(false) ||  VjudgeAccount::can_manage(user_id) {
            return true;
        }
        true
    }

    async fn execute(&self, input: &WorkflowValues) -> WorkflowValues {
        let db = get_connect().await.unwrap();
        let vjudge_id = input.get_value("vjudge_id").unwrap().to_string().parse::<i64>().unwrap();
        let data = VjudgeNode::from_db(&db, vjudge_id).await;
        if data.is_err() {
            return WorkflowValues::final_status(
                WorkflowStatus::failed(format!("Failed to get VjudgeNode: {}", data.err().unwrap()))
            );
        }
        let vjudge_node = data.unwrap();
        let public = &vjudge_node.public;
        let mut res = WorkflowValues::new();
        res.add_trusted("node_id", vjudge_node.node_id.into(), "from_node");
        res.add_trusted("handle", vjudge_node.public.iden.clone().into(), "from_node");
        res.add_trusted("platform", vjudge_node.public.platform.to_lowercase().clone().into(), "from_node");
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

        res
    }
}

#[derive(Clone)]
pub struct VerifiedUserIdService;

#[async_trait(?Send)]

impl Service for VerifiedUserIdService {
    fn is_end(&self) -> bool {
        false
    }

    fn get_info(&self) -> ServiceInfo {
        ServiceInfo {
            name: "verified_user_id".to_string(),
            description: "Verify user_id".to_string(),
            allow_description: "No input required".to_string(),
        }
    }

    fn get_cost(&self) -> i32 {
        1
    }

    fn get_import_require(&self) -> Box<dyn StatusRequire> {
        Box::new(
            WorkflowRequire::new()
                .with_key("user_id")
                .with_key("token"),
        )
    }

    fn get_export_describe(&self) -> Vec<Box<dyn StatusDescribe>> {
        vec![Box::new(
            WorkflowExportDescribe::new()
            .add_inner_has("user_id")
        )]
    }

    async fn verify(&self, input: &WorkflowValues) -> bool {
        // verify token.
        true
    }

    async fn execute(&self, input: &WorkflowValues) -> WorkflowValues {
        let mut res =  WorkflowValues::new();
        res.add_trusted("user_id", BaseValue::Number(input.get_value("user_id").unwrap().to_string().parse::<f64>().unwrap()), "workflow");
        res
    }


}


impl VerifiedUserIdService {
    pub fn new() -> Self {
        Self {
        }
    }
}