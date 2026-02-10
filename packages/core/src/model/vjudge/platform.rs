//! VJudge 平台与注册元信息类型
//!
//! 用于统一导出给前端/边缘服务的平台描述信息。

use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub struct EdgeServiceRegisterItem {
    pub platform: String,
    pub operation: String,
    pub method: Option<String>,
}

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub struct EdgePlatformFieldInfo {
    pub id: String,
    pub name: String,
    pub r#type: String,
    pub placeholder: String,
}

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub struct EdgePlatformMethodInfo {
    pub name: String,
    pub description: String,
    pub stable: i32,
    pub require_fields: Vec<EdgePlatformFieldInfo>,
    pub tips: Option<Vec<String>>,
    pub is_pwd: Option<bool>,
    pub payload_template: String,
}

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub struct EdgePlatformInfo {
    pub name: String,
    pub url: String,
    pub color: String,
    pub allow_method: Vec<EdgePlatformMethodInfo>,
}
