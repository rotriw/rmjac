use lazy_static::lazy_static;
use mongodb::Client;
use std::sync::Mutex;

lazy_static! {
    pub static ref MONGODB: Mutex<String> = Mutex::new("mongodb://127.0.0.1".to_string());
    pub static ref NODEID: Mutex<i64> = Mutex::new(0);
    pub static ref MONGODB_CLIENT: Mutex<Option<Client>> = Mutex::new(None);
    pub static ref MONGODB_DATABASE: Mutex<String> = Mutex::new("rmjac".to_string());
}
