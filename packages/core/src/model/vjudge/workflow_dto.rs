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

/// 工作流状态数据 DTO（新格式：无 status_type）
#[derive(Debug, Clone, Deserialize, Serialize, ts_rs::TS)]
#[ts(export)]
pub struct WorkflowStatusDataDTO {
    pub values: HashMap<String, WorkflowValueDTO>,
}

/// 工作流值 DTO（新格式）
#[derive(Debug, Clone, Deserialize, Serialize, ts_rs::TS)]
#[ts(export)]
#[serde(tag = "type", content = "value")]
pub enum WorkflowValueDTO {
    Inner(String),
    String(String),
    Number(f64),
    Bool(bool),
    List(Vec<WorkflowValueDTO>),
}

/// 工作流任务请求
#[derive(Debug, Clone, Deserialize, Serialize, ts_rs::TS)]
#[ts(export)]
pub struct WorkflowTaskRequest {
    pub service_name: String,
    pub input: WorkflowStatusDataDTO,
    pub timeout_ms: Option<u64>,
    pub ws_id: Option<String>,
    pub vjudge_node_id: Option<i64>,
}

/// 工作流任务响应
#[derive(Debug, Clone, Deserialize, Serialize, ts_rs::TS)]
#[ts(export)]
pub struct WorkflowTaskResponseDTO {
    pub success: bool,
    pub task_id: Option<String>,
    pub output: Option<WorkflowStatusDataDTO>,
    pub error: Option<String>,
}

/// 工作流任务状态查询响应
#[derive(Debug, Clone, Deserialize, Serialize, ts_rs::TS)]
#[ts(export)]
pub struct WorkflowTaskStatusDTO {
    pub task_id: String,
    pub db_status: String,
    pub log: String,
    pub created_at: String,
    pub updated_at: String,
    #[ts(type = "any")]
    pub workflow_status: Option<serde_json::Value>,
}

/// 工作流服务信息
#[derive(Debug, Clone, Deserialize, Serialize, ts_rs::TS)]
#[ts(export)]
pub struct WorkflowServiceInfo {
    pub name: String,
    pub description: String,
    pub allow_description: Option<String>,
    pub source: String,
    pub import_require: String,
    pub export_describe: String,
}

/// 终点参数信息
#[derive(Debug, Clone, Deserialize, Serialize, ts_rs::TS)]
#[ts(export)]
pub struct WorkflowTargetParamInfo {
    pub key: String,
    pub value_type: String,
    pub required: bool,
}

/// 终点信息
#[derive(Debug, Clone, Deserialize, Serialize, ts_rs::TS)]
#[ts(export)]
pub struct WorkflowTargetInfo {
    pub target: String,
    pub name: String,
    pub description: String,
    pub allow_description: Option<String>,
    pub platform: Option<String>,
    pub params: Vec<WorkflowTargetParamInfo>,
}

// ============================================================================
// 新旧类型转换
// ============================================================================

use workflow::value::{BaseValue, WorkflowValue};
use workflow::status::WorkflowValues;

impl WorkflowValueDTO {
    /// 转换为新的 BaseValue
    pub fn to_base_value(&self) -> BaseValue {
        match self {
            WorkflowValueDTO::Inner(s) => BaseValue::String(s.clone()),
            WorkflowValueDTO::String(s) => BaseValue::String(s.clone()),
            WorkflowValueDTO::Number(n) => BaseValue::Number(*n),
            WorkflowValueDTO::Bool(b) => BaseValue::Bool(*b),
            WorkflowValueDTO::List(items) => {
                BaseValue::List(items.iter().map(|item| item.to_base_value()).collect())
            }
        }
    }

    /// 转换为新的 WorkflowValue
    ///
    /// Inner 类型标记为 Trusted，其他标记为 Untrusted
    pub fn to_workflow_value(&self) -> WorkflowValue {
        match self {
            WorkflowValueDTO::Inner(s) => {
                WorkflowValue::trusted_from(BaseValue::String(s.clone()), "edge_server")
            }
            _ => WorkflowValue::untrusted(self.to_base_value()),
        }
    }

    /// 从 BaseValue 创建 DTO
    pub fn from_base_value(value: &BaseValue) -> Self {
        match value {
            BaseValue::String(s) => WorkflowValueDTO::String(s.clone()),
            BaseValue::Number(n) => WorkflowValueDTO::Number(*n),
            BaseValue::Int(n) => WorkflowValueDTO::Number(*n as f64),
            BaseValue::Bool(b) => WorkflowValueDTO::Bool(*b),
            BaseValue::List(items) => {
                WorkflowValueDTO::List(items.iter().map(WorkflowValueDTO::from_base_value).collect())
            }
            BaseValue::Object(map) => {
                // 序列化为字符串
                WorkflowValueDTO::String(serde_json::Value::Object(map.clone()).to_string())
            }
            BaseValue::Null => WorkflowValueDTO::String("null".to_string()),
        }
    }
}

impl WorkflowStatusDataDTO {
    /// 转换为新的 WorkflowValues
    ///
    /// 注意：由于这些内容来自 edge_server，均标记为可信
    pub fn to_workflow_values(&self) -> WorkflowValues {
        let mut values = WorkflowValues::new();
        for (key, dto) in &self.values {
            match dto {
                WorkflowValueDTO::Inner(s) => {
                    values.add_trusted(key, BaseValue::String(s.clone()), "edge_server");
                }
                _ => {
                    // edge_server 的值均可信
                    values.add_trusted(key, dto.to_base_value(), "edge_server");
                }
            }
        }
        values
    }

    /// 从 WorkflowValues 创建 DTO
    pub fn from_workflow_values(values: &WorkflowValues) -> Self {
        let mut map = HashMap::new();
        for (key, wv) in values.iter() {
            if wv.is_trusted() {
                // 可信值用 Inner 包装
                let base = wv.inner();
                map.insert(key.clone(), WorkflowValueDTO::Inner(format!("{}", base)));
            } else {
                map.insert(key.clone(), WorkflowValueDTO::from_base_value(wv.inner()));
            }
        }
        WorkflowStatusDataDTO { values: map }
    }
}
