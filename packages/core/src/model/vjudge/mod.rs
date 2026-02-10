//! VJudge 模块
//!
//! 提供远程评测平台（如 Codeforces、AtCoder）的账号管理、提交同步等功能。
//!
//! # 模块结构
//!
//! - [`account`]: 账号管理（创建、验证、删除等）
//! - [`task`]: 同步任务管理
//! - [`service`]: 核心服务层（提交同步、题目导入等）
//! - [`types`]: 共享类型定义
//! - [`error`]: 错误类型定义
//!
//! # 示例
//!
//! ```rust,ignore
//! use crate::model::vjudge::{VjudgeAccount, VjudgeService};
//!
//! // 列出用户的所有 VJudge 账号
//! let accounts = VjudgeAccount::list(&db, user_id).await?;
//!
//! // 创建新账号
//! let account = VjudgeAccount::create(
//!     &db, user_id, iden, platform, mode, auth, false, ws_id, false
//! ).await?;
//! ```

pub mod account;
pub mod error;
pub mod platform;
pub mod service;
pub mod task;
pub mod types;
pub mod workflow_dto;

// 重新导出主要类型，保持向后兼容
pub use account::VjudgeAccount;
pub use error::AddErrorResult;
pub use service::VjudgeService;
pub use task::VjudgeTask;
pub use types::{
    AssignTaskReq, BindAccountReq, Platform, SubmissionItem, UserSubmissionProp, VjudgeOperation,
};
