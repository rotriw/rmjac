use lazy_static::lazy_static;
use std::{collections::HashMap, sync::Mutex};

lazy_static! {
    pub static ref REDIS_URL: Mutex<String> = Mutex::new("redis://localhost:6379".to_string());
    pub static ref REDIS_CLIENT: Mutex<redis::Client> = Mutex::new(
        redis::Client::open(REDIS_URL.lock().unwrap().clone())
            .expect("Failed to create Redis client")
    );
    pub static ref PATH_VIS: Mutex<HashMap<i32, HashMap<i64, bool>>> = Mutex::new(HashMap::new());
    pub static ref SAVED_NODE_PATH: Mutex<HashMap<i64, HashMap<i64, i64>>> =
        Mutex::new(HashMap::new());
}
