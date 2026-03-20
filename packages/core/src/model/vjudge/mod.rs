use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use crate::service::save::Savable;

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub enum VjudgeAuth {
    OnlyTrusted, // 仅使用。
    Apikey {
        key: String,
        secret: String,
        username: String,
    },
    Cookie {
        cookies: HashMap<String, String>
    },
    Token {
        token: String,
    },
    Password {
        username: String,
        password: String,
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct VjudgeSubmitOption {
    pub submit_to: String,
    pub auth: VjudgeAuth,
}

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct Vjudge {
    pub handle: String,
    pub is_verified: bool,
    pub own_auth: Vec<VjudgeAuth>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct VjudgeTask {
    pub task_result: Option<String>,
    pub task_status: Option<VjudgeSubmitOption>,
}

impl Savable for Vjudge {}
impl Savable for VjudgeTask {}