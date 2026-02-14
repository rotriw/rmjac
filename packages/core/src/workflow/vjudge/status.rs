//! VJudge Status Types
//!
//! 拆分后的状态类型与兼容的 VjudgeStatus 共存，用于逐步迁移。
//!
//! This module defines the status types used in the VJudge workflow system.
//! These types implement the workflow::Status trait and related traits.

use serde::{Deserialize, Serialize};
use workflow::workflow::{Status, Value};
use workflow::value::{BaseValue, WorkflowValue};
use workflow::status::{WorkflowValues, WorkflowStatus};



#[derive(Serialize, Deserialize, Clone)]
pub enum VjudgeValue {
    Normal(serde_json::Value),
    InnerFunction(serde_json::Value),
    Error(String),
    TaskDone(String)
}

impl Value for VjudgeValue {
    fn get_type(&self) -> String {
        match self {
            VjudgeValue::Normal(_) => "Normal".to_string(),
            VjudgeValue::InnerFunction(_) => "InnerFunction".to_string(),
            VjudgeValue::Error(_) => "Error".to_string(),
            VjudgeValue::TaskDone(_) => "TaskDone".to_string(),
        }
    }

    fn to_string(&self) -> String {
        match self {
            VjudgeValue::Normal(v) => ToString::to_string(v),
            VjudgeValue::InnerFunction(v) => ToString::to_string(v),
            VjudgeValue::Error(e) => format!("Error: {}", e),
            VjudgeValue::TaskDone(msg) => format!("Task Done: {}", msg),
        }
    }
}

#[derive(Clone, Serialize, Deserialize)]
pub struct VjudgeStatus {
    pub inner: Vec<VjudgeValue>
}

/// 便捷构造器（向后兼容旧的枚举风格用法）
///
/// 旧代码使用 `VjudgeStatus::Normal(json)`，新代码应使用
/// `VjudgeStatus::from_json(json)` 或直接构造 WorkflowValues。
#[allow(non_snake_case)]
impl VjudgeStatus {
    /// 创建只包含一个 Normal 值的状态
    pub fn Normal(value: serde_json::Value) -> Self {
        VjudgeStatus { inner: vec![VjudgeValue::Normal(value)] }
    }

    /// 创建只包含一个 InnerFunction 值的状态
    pub fn InnerFunction(value: serde_json::Value) -> Self {
        VjudgeStatus { inner: vec![VjudgeValue::InnerFunction(value)] }
    }

    /// 创建只包含一个 Error 值的状态
    pub fn Error(msg: String) -> Self {
        VjudgeStatus { inner: vec![VjudgeValue::Error(msg)] }
    }

    /// 创建只包含一个 TaskDone 值的状态
    pub fn TaskDone(msg: String) -> Self {
        VjudgeStatus { inner: vec![VjudgeValue::TaskDone(msg)] }
    }
}


impl Status for VjudgeStatus {
    fn add_value(&self, key: &str, value: Box<dyn Value>) -> Box<dyn Status> {
        let mut new_inner = self.inner.clone();
        new_inner.push(VjudgeValue::Normal(serde_json::from_str(&value.to_string()).unwrap()));
        Box::new(VjudgeStatus { inner: new_inner })
    }

    fn get_value(&self, key: &str) -> Option<Box<dyn Value>> {
        if key.starts_with("inner:") {
            let inner_key = &key[6..];
            for v in &self.inner {
                if let VjudgeValue::InnerFunction(val) = v {
                    if let Some(inner_val) = val.get(inner_key) {
                        return Some(Box::new(VjudgeValue::Normal(inner_val.clone())));
                    }
                }
            }
        }
        for v in &self.inner {
            if let VjudgeValue::Normal(val) = v {
                if let Some(inner_val) = val.get(key) {
                    return Some(Box::new(VjudgeValue::Normal(inner_val.clone())));
                }
            }
        }
        None
    }

    fn get_all_value(&self) -> Vec<(String, Box<dyn Value>)> {
        let mut res: Vec<(String, Box<dyn Value>)> = vec![];
        for v in &self.inner {
            if let VjudgeValue::Normal(val) = v {
                if let Some(obj) = val.as_object() {
                    for (k, v) in obj {
                        res.push((k.clone(), Box::new(VjudgeValue::Normal(v.clone()))));
                    }
                }
            }
        }
        res
    }

    fn as_any(&self) -> &dyn std::any::Any {
        self
    }
}

// ============================================================================
// 新类型兼容层：VjudgeStatus 与 WorkflowStatus/WorkflowValues 互转
// ============================================================================

impl VjudgeStatus {
    /// 从 WorkflowValues 创建 VjudgeStatus（兼容旧代码）
    ///
    /// 将可信值存为 InnerFunction，不可信值存为 Normal
    pub fn from_workflow_values(values: &WorkflowValues) -> Self {
        let mut normal_map = serde_json::Map::new();
        let mut inner_map = serde_json::Map::new();

        for (key, wv) in values.iter() {
            let json_val: serde_json::Value = wv.inner().clone().into();
            if wv.is_trusted() {
                inner_map.insert(key.clone(), json_val);
            } else {
                normal_map.insert(key.clone(), json_val);
            }
        }

        let mut inner = vec![];
        if !normal_map.is_empty() {
            inner.push(VjudgeValue::Normal(serde_json::Value::Object(normal_map)));
        }
        if !inner_map.is_empty() {
            inner.push(VjudgeValue::InnerFunction(serde_json::Value::Object(inner_map)));
        }
        VjudgeStatus { inner }
    }

    /// 转换为 WorkflowValues（新类型）
    ///
    /// Normal 值标记为 Untrusted，InnerFunction 值标记为 Trusted
    pub fn to_workflow_values(&self) -> WorkflowValues {
        let mut values = WorkflowValues::new();

        for v in &self.inner {
            match v {
                VjudgeValue::Normal(val) => {
                    if let Some(obj) = val.as_object() {
                        for (k, v) in obj {
                            values.add_untrusted(k, BaseValue::from(v.clone()));
                        }
                    }
                }
                VjudgeValue::InnerFunction(val) => {
                    if let Some(obj) = val.as_object() {
                        for (k, v) in obj {
                            values.add_trusted(k, BaseValue::from(v.clone()), "inner_function");
                        }
                    }
                }
                _ => {} // Error/TaskDone 不属于值类型
            }
        }

        values
    }

    /// 从 WorkflowStatus 创建 VjudgeStatus（兼容旧代码）
    pub fn from_workflow_status(status: &WorkflowStatus) -> Self {
        match status {
            WorkflowStatus::Running(values) => Self::from_workflow_values(values),
            WorkflowStatus::Completed { values, message } => {
                let mut result = Self::from_workflow_values(values);
                // 如果有完成消息，附加为 TaskDone
                if let Some(msg) = message {
                    result.inner.push(VjudgeValue::TaskDone(msg.clone()));
                }
                result
            }
            WorkflowStatus::Failed { error, .. } => VjudgeStatus::Error(error.clone()),
        }
    }

    /// 转换为 WorkflowStatus（新类型）
    pub fn to_workflow_status(&self) -> WorkflowStatus {
        // 检查是否有 Error 或 TaskDone
        for v in &self.inner {
            match v {
                VjudgeValue::Error(err) => {
                    return WorkflowStatus::failed(err.clone());
                }
                VjudgeValue::TaskDone(msg) => {
                    return WorkflowStatus::completed(
                        self.to_workflow_values(),
                        Some(msg.clone()),
                    );
                }
                _ => {}
            }
        }
        WorkflowStatus::running(self.to_workflow_values())
    }

    /// 便捷构造：创建错误状态
    pub fn error_status(msg: impl Into<String>) -> Self {
        Self::Error(msg.into())
    }

    /// 便捷构造：创建完成状态
    pub fn task_done(msg: impl Into<String>) -> Self {
        Self::TaskDone(msg.into())
    }

    /// 便捷构造：从 JSON 创建 Normal 状态
    pub fn from_json(json: serde_json::Value) -> Self {
        Self::Normal(json)
    }

    /// 便捷构造：从 JSON 创建 InnerFunction（可信）状态
    pub fn from_json_trusted(json: serde_json::Value) -> Self {
        Self::InnerFunction(json)
    }
}

/// 从旧的 VjudgeValue 转换为新的 WorkflowValue
pub fn vjudge_value_to_workflow_value(old: &VjudgeValue) -> Option<WorkflowValue> {
    match old {
        VjudgeValue::Normal(v) => Some(WorkflowValue::untrusted(BaseValue::from(v.clone()))),
        VjudgeValue::InnerFunction(v) => Some(WorkflowValue::trusted(BaseValue::from(v.clone()))),
        VjudgeValue::Error(_) | VjudgeValue::TaskDone(_) => None, // 状态不是值
    }
}
