use crate::graph::action::DefaultNodes;
use crate::service::iden::ac_automaton::AcMachine;
use crate::workflow::vjudge::{VjudgeWorkflow, VjudgeWorkflowSystem};
use chrono;
use lazy_static::lazy_static;
use sea_orm::DatabaseConnection;
use socketioxide::extract::SocketRef;
use serde_json::Value;
use std::sync::Arc;
use std::{collections::HashMap, sync::Mutex};

lazy_static! {
    pub static ref REDIS_URL: Mutex<String> = Mutex::new("redis://localhost:6379".to_string());
    pub static ref REDIS_CLIENT: Mutex<redis::Client> = Mutex::new(
        redis::Client::open(REDIS_URL.lock().unwrap().clone())
            .expect("Failed to create Redis client")
    );
    pub static ref PATH_VIS: Mutex<HashMap<i32, HashMap<i64, bool>>> = Mutex::new(HashMap::new());
    pub static ref SAVED_NODE_PATH: Mutex<HashMap<(i64, String), HashMap<i64, i64>>> =
        Mutex::new(HashMap::new());
    pub static ref SAVED_NODE_PATH_REV: Mutex<HashMap<(i64, String), HashMap<i64, i64>>> =
        Mutex::new(HashMap::new());
    pub static ref SAVED_NODE_PATH_LIST: Mutex<HashMap<String, Vec<i64>>> =
        Mutex::new(HashMap::new());
    pub static ref SAVED_NODE_CIRCLE_ID: Mutex<i32> = Mutex::new(0);
    pub static ref DEFAULT_NODES: Mutex<DefaultNodes> = Mutex::new(DefaultNodes {
        guest_user_node: -1,
        default_strategy_node: -1,
        default_iden_node: -1,
        default_system_node: -1,
    });
    pub static ref DB_URL: Mutex<String> = Mutex::new("postgres://localhost/rmjac".to_string());
    pub static ref DB_SCHEMA: Mutex<String> = Mutex::new("public".to_string());
    pub static ref CONNECTION_POOL: Arc<Mutex<Option<DatabaseConnection>>> =
        Arc::new(Mutex::new(None));
    pub static ref EDGE_AUTH_PUBLICKEY: Mutex<String> = Mutex::new("".to_string());
    pub static ref EDGE_AUTH_MAP: Mutex<HashMap<String, i32>> = Mutex::new(HashMap::new());
    pub static ref EDGE_SOCKETS: Mutex<HashMap<String, SocketRef>> = Mutex::new(HashMap::new());
    pub static ref EDGE_VEC: Mutex<Vec<String>> = Mutex::new(vec![]);
    pub static ref EDGE_NUM: Mutex<i32> = Mutex::new(0);
    pub static ref EDGE_PLATFORM_INFO: Mutex<HashMap<String, Value>> =
        Mutex::new(HashMap::new());
    pub static ref SLICE_WORD_LIST: Mutex<Vec<String>> = Mutex::new(vec![]);
    pub static ref SLICE_WORD_ACMAC: Mutex<AcMachine> = Mutex::new(AcMachine::build(
        SLICE_WORD_LIST
            .lock()
            .unwrap()
            .clone()
            .iter()
            .map(AsRef::as_ref)
            .collect()
    ));
    pub static ref USER_WEBSOCKET_CONNECTIONS: Mutex<HashMap<String, SocketRef>> =
        Mutex::new(HashMap::new());
    pub static ref USER_WEBSOCKET_CONNECTIONS_ACCOUNT: Mutex<HashMap<String, i64>> =
        Mutex::new(HashMap::new());
    /// 全局 VJudge 工作流
    pub static ref VJUDGE_WORKFLOW: Mutex<Option<Arc<VjudgeWorkflowSystem>>> =
        Mutex::new(None);
}

pub mod db;
