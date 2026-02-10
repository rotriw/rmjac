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
/// 管理一组带信任标记的键值对。
#[derive(Debug, Clone, Serialize, Deserialize, Default, TS)]
#[ts(export)]
pub struct WorkflowValues {
    inner: HashMap<String, WorkflowValue>,
}

impl WorkflowValues {
    /// 创建空的值集合
    pub fn new() -> Self {
        Self {
            inner: HashMap::new(),
        }
    }

    /// 添加不可信值（来自外部输入）
    pub fn add_untrusted(&mut self, key: &str, value: BaseValue) {
        self.inner
            .insert(key.to_string(), WorkflowValue::untrusted(value));
    }

    /// 添加可信值（服务内部生成）
    pub fn add_trusted(&mut self, key: &str, value: BaseValue, source: &str) {
        self.inner
            .insert(key.to_string(), WorkflowValue::trusted_from(value, source));
    }

    /// 直接添加 WorkflowValue
    pub fn add(&mut self, key: &str, value: WorkflowValue) {
        self.inner.insert(key.to_string(), value);
    }

    /// 获取值（不检查信任级别）
    pub fn get(&self, key: &str) -> Option<&WorkflowValue> {
        self.inner.get(key)
    }

    /// 获取可信值（只返回 Trusted 的内部值）
    pub fn get_trusted(&self, key: &str) -> Option<&BaseValue> {
        self.inner.get(key).and_then(|v| {
            if v.is_trusted() {
                Some(v.inner())
            } else {
                None
            }
        })
    }

    /// 获取内部基础值（不检查信任级别）
    pub fn get_inner(&self, key: &str) -> Option<&BaseValue> {
        self.inner.get(key).map(|v| v.inner())
    }

    /// 要求获取可信值（用于安全敏感场景）
    pub fn require_trusted(&self, key: &str) -> Result<&BaseValue, WorkflowValueError> {
        match self.inner.get(key) {
            Some(v) if v.is_trusted() => Ok(v.inner()),
            Some(_) => Err(WorkflowValueError::UntrustedValue(key.to_string())),
            None => Err(WorkflowValueError::MissingValue(key.to_string())),
        }
    }

    /// 检查是否包含某个 key
    pub fn contains_key(&self, key: &str) -> bool {
        self.inner.contains_key(key)
    }

    /// 获取所有键值对
    pub fn iter(&self) -> impl Iterator<Item = (&String, &WorkflowValue)> {
        self.inner.iter()
    }

    /// 获取所有 key
    pub fn keys(&self) -> impl Iterator<Item = &String> {
        self.inner.keys()
    }

    /// 获取值的数量
    pub fn len(&self) -> usize {
        self.inner.len()
    }

    /// 是否为空
    pub fn is_empty(&self) -> bool {
        self.inner.is_empty()
    }

    /// 合并另一组值（覆盖已存在的 key）
    pub fn merge(&mut self, other: WorkflowValues) {
        for (k, v) in other.inner {
            self.inner.insert(k, v);
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
        let mut map = serde_json::Map::new();
        for (k, v) in &self.inner {
            map.insert(k.clone(), serde_json::Value::from(v.inner().clone()));
        }
        serde_json::Value::Object(map)
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
        "WorkflowValues".to_string()
    }

    fn to_string(&self) -> String {
        serde_json::to_string(&self.to_json()).unwrap_or_else(|_| "{}".to_string())
    }
}

impl crate::workflow::Status for WorkflowValues {
    fn add_value(&self, key: &str, value: Box<dyn crate::workflow::Value>) -> Box<dyn crate::workflow::Status> {
        let mut new = self.clone();
        // 解析 value 为 BaseValue，默认标记为 untrusted
        let raw = crate::workflow::Value::to_string(value.as_ref());
        let json_val = serde_json::from_str::<serde_json::Value>(&raw).unwrap_or(serde_json::Value::String(raw));
        new.add_untrusted(key, BaseValue::from(json_val));
        Box::new(new)
    }

    fn get_value(&self, key: &str) -> Option<Box<dyn crate::workflow::Value>> {
        // 支持 inner: 前缀查找可信值
        if key.starts_with("inner:") {
            let inner_key = &key[6..];
            self.inner.get(inner_key).and_then(|wv| {
                if wv.is_trusted() {
                    Some(Box::new(wv.inner().clone()) as Box<dyn crate::workflow::Value>)
                } else {
                    None
                }
            })
        } else {
            self.inner.get(key).map(|wv| {
                Box::new(wv.inner().clone()) as Box<dyn crate::workflow::Value>
            })
        }
    }

    fn get_all_value(&self) -> Vec<(String, Box<dyn crate::workflow::Value>)> {
        self.inner
            .iter()
            .map(|(k, wv)| {
                (k.clone(), Box::new(wv.clone()) as Box<dyn crate::workflow::Value>)
            })
            .collect()
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
}