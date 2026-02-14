//! Workflow Status Types
//!
//! 定义 workflow 的状态管理类型，将"状态"与"值"分离。
//!
//! # 设计
//!
//! - `WorkflowValues`: 键值对集合，每个值带有信任标记
//! - `WorkflowStatus`: 工作流执行状态（运行中 / 完成 / 失败）
//!
//! # 示例
//!
//! ```rust
//! use workflow::value::{BaseValue, WorkflowValue};
//! use workflow::status::{WorkflowValues, WorkflowStatus};
//!
//! let mut values = WorkflowValues::new();
//! values.add_untrusted("platform", BaseValue::from("codeforces"));
//! values.add_trusted("account_id", BaseValue::from(456i64), "db_lookup");
//!
//! assert!(values.get("platform").is_some());
//! assert!(values.get_trusted("account_id").is_some());
//! assert!(values.get_trusted("platform").is_none()); // 不可信
//!
//! let status = WorkflowStatus::Running(values);
//! ```

use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use crate::value::{BaseValue, WorkflowValue, WorkflowValueError};
use ts_rs::TS;

/// 值集合
///
/// 管理一组带信任标记的键值对，或者表示最终状态。
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(tag = "kind")]
#[ts(export)]
pub enum WorkflowValues {
    /// 正常键值对集合
    Values {
        inner: HashMap<String, WorkflowValue>,
    },
    /// 最终状态（完成/失败），包装 WorkflowStatus
    Final {
        #[ts(type = "WorkflowStatus")]
        inner: Box<WorkflowStatus>,
    },
}

impl Default for WorkflowValues {
    fn default() -> Self {
        Self::Values {
            inner: HashMap::new(),
        }
    }
}

impl WorkflowValues {
    /// 创建空的值集合
    pub fn new() -> Self {
        Self::default()
    }

    /// 从 WorkflowStatus 创建 Final 状态
    pub fn final_status(status: WorkflowStatus) -> Self {
        Self::Final {
            inner: Box::new(status),
        }
    }

    /// 获取内部 HashMap 的可变引用（仅 Values 变体）
    fn inner_map_mut(&mut self) -> &mut HashMap<String, WorkflowValue> {
        match self {
            Self::Values { inner } => inner,
            Self::Final { .. } => panic!("Cannot mutate a Final WorkflowValues"),
        }
    }

    /// 获取内部 HashMap 的引用（仅 Values 变体）
    fn inner_map(&self) -> &HashMap<String, WorkflowValue> {
        match self {
            Self::Values { inner } => inner,
            Self::Final { .. } => {
                // 对于 Final 状态，委托给其内部 values
                static EMPTY: std::sync::LazyLock<HashMap<String, WorkflowValue>> =
                    std::sync::LazyLock::new(HashMap::new);
                &EMPTY
            }
        }
    }

    /// 是否为 Final 状态
    pub fn is_final(&self) -> bool {
        matches!(self, Self::Final { .. })
    }

    /// 获取 Final 内部的 WorkflowStatus（如果是 Final）
    pub fn as_final(&self) -> Option<&WorkflowStatus> {
        match self {
            Self::Final { inner } => Some(inner),
            _ => None,
        }
    }

    /// 添加不可信值（来自外部输入）
    pub fn add_untrusted(&mut self, key: &str, value: BaseValue) {
        self.inner_map_mut()
            .insert(key.to_string(), WorkflowValue::untrusted(value));
    }

    /// 添加可信值（服务内部生成）
    pub fn add_trusted(&mut self, key: &str, value: BaseValue, source: &str) {
        self.inner_map_mut()
            .insert(key.to_string(), WorkflowValue::trusted_from(value, source));
    }

    /// 直接添加 WorkflowValue
    pub fn add(&mut self, key: &str, value: WorkflowValue) {
        self.inner_map_mut().insert(key.to_string(), value);
    }

    /// 获取值（不检查信任级别）
    pub fn get(&self, key: &str) -> Option<&WorkflowValue> {
        match self {
            Self::Values { inner } => inner.get(key),
            Self::Final { inner } => inner.values().and_then(|v| v.get(key)),
        }
    }

    /// 获取可信值（只返回 Trusted 的内部值）
    pub fn get_trusted(&self, key: &str) -> Option<&BaseValue> {
        self.get(key).and_then(|v| {
            if v.is_trusted() {
                Some(v.inner())
            } else {
                None
            }
        })
    }

    /// 获取内部基础值（不检查信任级别）
    pub fn get_inner(&self, key: &str) -> Option<&BaseValue> {
        self.get(key).map(|v| v.inner())
    }

    /// 要求获取可信值（用于安全敏感场景）
    pub fn require_trusted(&self, key: &str) -> Result<&BaseValue, WorkflowValueError> {
        match self.get(key) {
            Some(v) if v.is_trusted() => Ok(v.inner()),
            Some(_) => Err(WorkflowValueError::UntrustedValue(key.to_string())),
            None => Err(WorkflowValueError::MissingValue(key.to_string())),
        }
    }

    /// 检查是否包含某个 key
    pub fn contains_key(&self, key: &str) -> bool {
        self.get(key).is_some()
    }

    /// 获取所有键值对
    pub fn iter(&self) -> impl Iterator<Item = (&String, &WorkflowValue)> {
        self.inner_map().iter()
    }

    /// 获取所有 key
    pub fn keys(&self) -> impl Iterator<Item = &String> {
        self.inner_map().keys()
    }

    /// 获取值的数量
    pub fn len(&self) -> usize {
        self.inner_map().len()
    }

    /// 是否为空
    pub fn is_empty(&self) -> bool {
        self.inner_map().is_empty()
    }

    /// 合并另一组值（覆盖已存在的 key）
    pub fn merge(&mut self, other: WorkflowValues) {
        match other {
            WorkflowValues::Values { inner: other_inner } => {
                for (k, v) in other_inner {
                    self.inner_map_mut().insert(k, v);
                }
            }
            WorkflowValues::Final { .. } => {
                // 如果 other 是 Final，直接替换自身
                *self = other;
            }
        }
    }

    /// 从 `serde_json::Value` (Object) 创建，所有值标记为不可信
    pub fn from_json_untrusted(json: serde_json::Value) -> Self {
        let mut values = Self::new();
        if let serde_json::Value::Object(map) = json {
            for (k, v) in map {
                values.add_untrusted(&k, BaseValue::from(v));
            }
        }
        values
    }

    /// 从 `serde_json::Value` (Object) 创建，所有值标记为可信
    pub fn from_json_trusted(json: serde_json::Value, source: &str) -> Self {
        let mut values = Self::new();
        if let serde_json::Value::Object(map) = json {
            for (k, v) in map {
                values.add_trusted(&k, BaseValue::from(v), source);
            }
        }
        values
    }

    /// 转换为 `serde_json::Value` (Object)，丢弃信任标记
    pub fn to_json(&self) -> serde_json::Value {
        let map_ref = self.inner_map();
        let mut map = serde_json::Map::new();
        for (k, v) in map_ref {
            map.insert(k.clone(), serde_json::Value::from(v.inner().clone()));
        }
        serde_json::Value::Object(map)
    }

    /// 获取值（通过 Status trait 代理，支持 inner: 前缀）
    ///
    /// 直接作为 inherent method 提供，避免需要 import Status trait
    pub fn get_value(&self, key: &str) -> Option<Box<dyn crate::workflow::Value>> {
        <Self as crate::workflow::Status>::get_value(self, key)
    }

    /// 获取所有键值对（通过 Status trait 代理）
    pub fn get_all_value(&self) -> Vec<(String, Box<dyn crate::workflow::Value>)> {
        <Self as crate::workflow::Status>::get_all_value(self)
    }

    // ========================================================================
    // 任务执行状态导出
    // ========================================================================

    /// 获取 Final 变体中的 WorkflowStatus
    ///
    /// 如果当前为 `Final` 变体，返回其中的 `WorkflowStatus`。
    /// 否则返回 `None`（表示正常的值传递阶段）。
    pub fn get_final_status(&self) -> Option<&WorkflowStatus> {
        self.as_final()
    }

    /// 判断当前是否为 Final(Failed) 状态
    ///
    /// 用于在执行过程中检测服务是否返回了失败信号，以便及时退出。
    pub fn is_failed_final(&self) -> bool {
        matches!(self, Self::Final { inner } if inner.is_failed())
    }

    /// 判断当前是否为 Final(Completed) 状态
    pub fn is_completed_final(&self) -> bool {
        matches!(self, Self::Final { inner } if inner.is_completed())
    }

    /// 获取 Final(Failed) 的错误信息
    pub fn final_error(&self) -> Option<&str> {
        match self {
            Self::Final { inner } => inner.error(),
            _ => None,
        }
    }
}

/// Workflow 状态
///
/// 表示工作流执行过程中的三种状态：
/// - `Running`: 正在执行中，携带当前值
/// - `Completed`: 成功完成
/// - `Failed`: 执行失败
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub enum WorkflowStatus {
    /// 正常执行中
    Running(WorkflowValues),
    /// 成功完成
    Completed {
        values: WorkflowValues,
        message: Option<String>,
    },
    /// 执行失败
    Failed {
        error: String,
        #[ts(type = "unknown")]
        context: Option<serde_json::Value>,
    },
}

impl Default for WorkflowStatus {
    fn default() -> Self {
        Self::Running(WorkflowValues::new())
    }
}

impl WorkflowStatus {
    /// 创建运行中状态
    pub fn running(values: WorkflowValues) -> Self {
        Self::Running(values)
    }

    /// 创建成功完成状态
    pub fn completed(values: WorkflowValues, message: Option<String>) -> Self {
        Self::Completed { values, message }
    }

    /// 创建失败状态
    pub fn failed(error: impl Into<String>) -> Self {
        Self::Failed {
            error: error.into(),
            context: None,
        }
    }

    /// 创建带上下文的失败状态
    pub fn failed_with_context(error: impl Into<String>, context: serde_json::Value) -> Self {
        Self::Failed {
            error: error.into(),
            context: Some(context),
        }
    }

    /// 创建完成状态（无附加值，仅消息）
    pub fn task_done(message: impl Into<String>) -> Self {
        Self::Completed {
            values: WorkflowValues::new(),
            message: Some(message.into()),
        }
    }

    /// 获取值（如果是 Running 或 Completed 状态）
    pub fn values(&self) -> Option<&WorkflowValues> {
        match self {
            Self::Running(values) => Some(values),
            Self::Completed { values, .. } => Some(values),
            Self::Failed { .. } => None,
        }
    }

    /// 获取可变值引用
    pub fn values_mut(&mut self) -> Option<&mut WorkflowValues> {
        match self {
            Self::Running(values) => Some(values),
            Self::Completed { values, .. } => Some(values),
            Self::Failed { .. } => None,
        }
    }

    /// 是否执行中
    pub fn is_running(&self) -> bool {
        matches!(self, Self::Running(_))
    }

    /// 是否已完成
    pub fn is_completed(&self) -> bool {
        matches!(self, Self::Completed { .. })
    }

    /// 是否失败
    pub fn is_failed(&self) -> bool {
        matches!(self, Self::Failed { .. })
    }

    /// 获取错误信息
    pub fn error(&self) -> Option<&str> {
        match self {
            Self::Failed { error, .. } => Some(error),
            _ => None,
        }
    }
}

// ============================================================================
// 实现 workflow Status trait for WorkflowValues
// ============================================================================

impl crate::workflow::Value for WorkflowValues {
    fn get_type(&self) -> String {
        match self {
            Self::Values { .. } => "WorkflowValues".to_string(),
            Self::Final { inner } => format!("Final({})", crate::workflow::Value::get_type(inner.as_ref())),
        }
    }

    fn to_string(&self) -> String {
        match self {
            Self::Values { .. } => serde_json::to_string(&self.to_json()).unwrap_or_else(|_| "{}".to_string()),
            Self::Final { inner } => crate::workflow::Value::to_string(inner.as_ref()),
        }
    }
}

impl crate::workflow::Status for WorkflowValues {
    fn add_value(&self, key: &str, value: Box<dyn crate::workflow::Value>) -> Box<dyn crate::workflow::Status> {
        match self {
            Self::Final { .. } => Box::new(self.clone()), // Final 状态不可修改
            Self::Values { inner } => {
                let mut new = self.clone();
                let raw = crate::workflow::Value::to_string(value.as_ref());
                let json_val = serde_json::from_str::<serde_json::Value>(&raw).unwrap_or(serde_json::Value::String(raw));
                new.add_untrusted(key, BaseValue::from(json_val));
                Box::new(new)
            }
        }
    }

    fn as_any(&self) -> &dyn std::any::Any {
        self
    }

    fn get_value(&self, key: &str) -> Option<Box<dyn crate::workflow::Value>> {
        match self {
            Self::Final { inner } => {
                // 委托给 WorkflowStatus 的 Status 实现
                crate::workflow::Status::get_value(inner.as_ref(), key)
            }
            Self::Values { inner } => {
                // 支持 inner: 前缀查找可信值
                if key.starts_with("inner:") {
                    let inner_key = &key[6..];
                    inner.get(inner_key).and_then(|wv| {
                        if wv.is_trusted() {
                            Some(Box::new(wv.inner().clone()) as Box<dyn crate::workflow::Value>)
                        } else {
                            None
                        }
                    })
                } else {
                    inner.get(key).map(|wv| {
                        Box::new(wv.inner().clone()) as Box<dyn crate::workflow::Value>
                    })
                }
            }
        }
    }

    fn get_all_value(&self) -> Vec<(String, Box<dyn crate::workflow::Value>)> {
        match self {
            Self::Final { inner } => {
                crate::workflow::Status::get_all_value(inner.as_ref())
            }
            Self::Values { inner } => {
                inner
                    .iter()
                    .map(|(k, wv)| {
                        (k.clone(), Box::new(wv.clone()) as Box<dyn crate::workflow::Value>)
                    })
                    .collect()
            }
        }
    }

    fn is_final_failed(&self) -> bool {
        self.is_failed_final()
    }

    fn export_task_status(&self) -> String {
        match self {
            Self::Values { .. } => "running".to_string(),
            Self::Final { inner } => match inner.as_ref() {
                WorkflowStatus::Running(_) => "running".to_string(),
                WorkflowStatus::Completed { .. } => "completed".to_string(),
                WorkflowStatus::Failed { .. } => "failed".to_string(),
            },
        }
    }

    fn final_error_message(&self) -> Option<String> {
        self.final_error().map(|s| s.to_string())
    }
}

// ============================================================================
// 实现 workflow Status trait for WorkflowStatus
// ============================================================================

impl crate::workflow::Value for WorkflowStatus {
    fn get_type(&self) -> String {
        match self {
            Self::Running(_) => "Running".to_string(),
            Self::Completed { .. } => "Completed".to_string(),
            Self::Failed { .. } => "Failed".to_string(),
        }
    }

    fn to_string(&self) -> String {
        match self {
            Self::Running(values) => crate::workflow::Value::to_string(values),
            Self::Completed { values, message } => {
                if let Some(msg) = message {
                    format!("Completed({}): {}", crate::workflow::Value::to_string(values), msg)
                } else {
                    format!("Completed({})", crate::workflow::Value::to_string(values))
                }
            }
            Self::Failed { error, .. } => format!("Error: {}", error),
        }
    }
}

impl crate::workflow::Status for WorkflowStatus {
    fn add_value(&self, key: &str, value: Box<dyn crate::workflow::Value>) -> Box<dyn crate::workflow::Status> {
        let mut new = self.clone();
        if let Some(values) = new.values_mut() {
            let raw = crate::workflow::Value::to_string(value.as_ref());
            let json_val = serde_json::from_str::<serde_json::Value>(&raw).unwrap_or(serde_json::Value::String(raw));
            values.add_untrusted(key, BaseValue::from(json_val));
        }
        Box::new(new)
    }

    fn as_any(&self) -> &dyn std::any::Any {
        self
    }

    fn get_value(&self, key: &str) -> Option<Box<dyn crate::workflow::Value>> {
        self.values().and_then(|values| {
            crate::workflow::Status::get_value(values, key)
        })
    }

    fn get_all_value(&self) -> Vec<(String, Box<dyn crate::workflow::Value>)> {
        self.values()
            .map(|values| crate::workflow::Status::get_all_value(values))
            .unwrap_or_default()
    }

    fn is_final_failed(&self) -> bool {
        self.is_failed()
    }

    fn export_task_status(&self) -> String {
        match self {
            Self::Running(_) => "running".to_string(),
            Self::Completed { .. } => "completed".to_string(),
            Self::Failed { .. } => "failed".to_string(),
        }
    }

    fn final_error_message(&self) -> Option<String> {
        self.error().map(|s| s.to_string())
    }
}