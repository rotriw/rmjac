//! Workflow DTO 类型定义
//!
//! 用于 HTTP API 与前端交互的工作流数据传输对象。
//! 这些类型通过 ts-rs 自动导出为 TypeScript 类型。
//! 这些内容均来自edge_server，均可信。

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
/// 工作流状态数据 DTO
#[derive(Debug, Clone, Deserialize, Serialize, ts_rs::TS)]
#[ts(export)]
pub struct WorkflowInnerStatusDataDTO {
    pub values: HashMap<String, WorkflowInnerValueDTO>,
}

/// 工作流值 DTO
#[derive(Debug, Clone, Deserialize, Serialize, ts_rs::TS)]
#[ts(export)]
#[serde(tag = "type", content = "value")]
pub enum WorkflowInnerValueDTO {
    Inner(String),
    String(String),
    Number(f64),
    Bool(bool),
    List(Vec<WorkflowInnerValueDTO>),
}
