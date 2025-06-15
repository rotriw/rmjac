use lazy_static::lazy_static;
use std::sync::Mutex;

lazy_static! {
    pub static ref POSTGRESQL: Mutex<String> = Mutex::new("postgres://localhost/rmjac".to_string());
    pub static ref NODEID: Mutex<u128> = Mutex::new(0);
}
