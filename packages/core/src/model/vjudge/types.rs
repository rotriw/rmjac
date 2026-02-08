//! VJudge 共享类型定义
//!
//! 包含所有 VJudge 模块的请求/响应结构和共享类型

use crate::graph::node::user::remote_account::VjudgeAuth;
use serde::{Deserialize, Serialize};

/// 平台类型枚举
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Platform {
    Codeforces,
    Atcoder,
}

/// 分配任务请求
#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub struct AssignTaskReq {
    pub vjudge_node_id: i64,
    pub range: String,
    pub ws_id: Option<String>,
}

/// 提交记录项
#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub struct SubmissionItem {
    pub remote_id: i64,
    pub remote_platform: String,
    pub remote_problem_id: String,
    pub language: String,
    pub code: String,
    pub status: String,
    pub message: String,
    pub score: i64,
    pub submit_time: String,
    pub url: String,
    /// (testcase_id, status, score, time, memory)
    pub passed: Vec<(String, String, i64, i64, i64)>,
}

/// 绑定账号请求
#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub struct BindAccountReq {
    pub platform: String,
    pub method: String,
    pub auth: Option<VjudgeAuth>,
    pub bypass_check: Option<bool>,
    pub ws_id: Option<String>,
    pub iden: String,
}

/// 用户提交属性（批量更新用）
#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub struct UserSubmissionProp {
    pub user_id: i64,
    pub ws_id: Option<String>,
    pub submissions: Vec<SubmissionItem>,
    pub task_id: Option<i64>,
}

/// 边缘服务操作类型
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum VjudgeOperation {
    /// 验证账号
    Verify,
    /// 同步单条记录
    SyncOne,
    /// 同步列表
    SyncList,
}

impl VjudgeOperation {
    /// 转换为边缘服务识别的操作字符串
    pub fn as_str(&self) -> &'static str {
        match self {
            VjudgeOperation::Verify => "verify",
            VjudgeOperation::SyncOne => "syncOne",
            VjudgeOperation::SyncList => "syncList",
        }
    }
}

impl From<VjudgeOperation> for String {
    fn from(op: VjudgeOperation) -> Self {
        op.as_str().to_string()
    }
}

impl std::fmt::Display for VjudgeOperation {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}
