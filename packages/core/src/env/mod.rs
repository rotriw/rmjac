use lazy_static::lazy_static;
use std::{collections::HashMap, sync::Mutex};
use socketioxide::extract::SocketRef;
use crate::graph::action::DefaultNodes;

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
        default_strategy_node: -1
    });

    pub static ref EDGE_AUTH: Mutex<String> = Mutex::new("".to_string());
    pub static ref EDGE_AUTH_MAP: Mutex<HashMap<String, i32>> = Mutex::new(HashMap::new());
    pub static ref EDGE_SOCKETS: Mutex<HashMap<String, SocketRef>> = Mutex::new(HashMap::new());
    pub static ref EDGE_VEC: Mutex<Vec<String>> = Mutex::new(vec![]);
    pub static ref EDGE_NUM: Mutex<i32> = Mutex::new(0);
}
