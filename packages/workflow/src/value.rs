#![allow(clippy::all)]
//! Workflow Value Types
//!
//! 定义统一的值类型系统，支持信任标记。
//!
//! # 安全模型
//!
//! - **Untrusted**: 来自外部输入（前端、用户请求等），不可直接用于安全敏感操作
//! - **Trusted**: 来自后端服务生成（Rust/TypeScript 服务），可安全使用
//!
//! # 示例
//!
//! ```rust
//! use workflow::value::{BaseValue, WorkflowValue};
//!
//! // 创建不可信值（来自用户输入）
//! let untrusted = WorkflowValue::untrusted(BaseValue::from("user_input"));
//!
//! // 创建可信值（服务内部生成）
//! let trusted = WorkflowValue::trusted(BaseValue::from(42i64));
//!
//! // 创建带来源的可信值
//! let trusted_from = WorkflowValue::trusted_from(BaseValue::Bool(true), "verify_account");
//!
//! // 提升信任级别
//! let promoted = untrusted.promote("my_service");
//! assert!(promoted.is_trusted());
//! ```

use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// 基础值类型
///
/// 表示 workflow 中传递的各种基本数据类型。
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, TS)]
#[serde(tag = "type", content = "value")]
#[ts(export)]
pub enum BaseValue {
    /// 字符串值
    String(std::string::String),
    /// 浮点数值
    Number(f64),
    /// 整数值
    Int(i64),
    /// 布尔值
    Bool(bool),
    /// 列表值
    List(Vec<BaseValue>),
    /// 对象值（保留 JSON 兼容性）
    #[ts(type = "Record<string, unknown>")]
    Object(#[ts(type = "Record<string, unknown>")] serde_json::Map<std::string::String, serde_json::Value>),
    /// 空值
    Null,
}

impl BaseValue {
    /// 尝试获取字符串值
    pub fn as_str(&self) -> Option<&str> {
        match self {
            BaseValue::String(s) => Some(s),
            _ => None,
        }
    }

    /// 尝试获取整数值
    pub fn as_i64(&self) -> Option<i64> {
        match self {
            BaseValue::Int(n) => Some(*n),
            BaseValue::Number(n) => Some(*n as i64),
            _ => None,
        }
    }

    /// 尝试获取浮点数值
    pub fn as_f64(&self) -> Option<f64> {
        match self {
            BaseValue::Number(n) => Some(*n),
            BaseValue::Int(n) => Some(*n as f64),
            _ => None,
        }
    }

    /// 尝试获取布尔值
    pub fn as_bool(&self) -> Option<bool> {
        match self {
            BaseValue::Bool(b) => Some(*b),
            _ => None,
        }
    }

    /// 判断是否为 Null
    pub fn is_null(&self) -> bool {
        matches!(self, BaseValue::Null)
    }
}

/// 从 `serde_json::Value` 转换为 `BaseValue`
impl From<serde_json::Value> for BaseValue {
    fn from(v: serde_json::Value) -> Self {
        match v {
            serde_json::Value::Null => BaseValue::Null,
            serde_json::Value::Bool(b) => BaseValue::Bool(b),
            serde_json::Value::Number(n) => {
                if let Some(i) = n.as_i64() {
                    BaseValue::Int(i)
                } else {
                    BaseValue::Number(n.as_f64().unwrap_or(0.0))
                }
            }
            serde_json::Value::String(s) => BaseValue::String(s),
            serde_json::Value::Array(arr) => {
                BaseValue::List(arr.into_iter().map(BaseValue::from).collect())
            }
            serde_json::Value::Object(map) => BaseValue::Object(map),
        }
    }
}

/// 从 `BaseValue` 转换为 `serde_json::Value`
impl From<BaseValue> for serde_json::Value {
    fn from(v: BaseValue) -> Self {
        match v {
            BaseValue::Null => serde_json::Value::Null,
            BaseValue::Bool(b) => serde_json::Value::Bool(b),
            BaseValue::Number(n) => serde_json::json!(n),
            BaseValue::Int(n) => serde_json::json!(n),
            BaseValue::String(s) => serde_json::Value::String(s),
            BaseValue::List(arr) => {
                serde_json::Value::Array(arr.into_iter().map(serde_json::Value::from).collect())
            }
            BaseValue::Object(map) => serde_json::Value::Object(map),
        }
    }
}

impl From<&serde_json::Value> for BaseValue {
    fn from(v: &serde_json::Value) -> Self {
        v.clone().into()
    }
}

// 便捷构造方法

impl From<std::string::String> for BaseValue {
    fn from(s: std::string::String) -> Self {
        BaseValue::String(s)
    }
}

impl From<&str> for BaseValue {
    fn from(s: &str) -> Self {
        BaseValue::String(s.to_string())
    }
}

impl From<i64> for BaseValue {
    fn from(n: i64) -> Self {
        BaseValue::Int(n)
    }
}

impl From<i32> for BaseValue {
    fn from(n: i32) -> Self {
        BaseValue::Int(n as i64)
    }
}

impl From<f64> for BaseValue {
    fn from(n: f64) -> Self {
        BaseValue::Number(n)
    }
}

impl From<bool> for BaseValue {
    fn from(b: bool) -> Self {
        BaseValue::Bool(b)
    }
}

impl<T: Into<BaseValue>> From<Vec<T>> for BaseValue {
    fn from(v: Vec<T>) -> Self {
        BaseValue::List(v.into_iter().map(Into::into).collect())
    }
}

impl std::fmt::Display for BaseValue {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            BaseValue::String(s) => write!(f, "{}", s),
            BaseValue::Number(n) => write!(f, "{}", n),
            BaseValue::Int(n) => write!(f, "{}", n),
            BaseValue::Bool(b) => write!(f, "{}", b),
            BaseValue::List(arr) => {
                write!(f, "[")?;
                for (i, v) in arr.iter().enumerate() {
                    if i > 0 {
                        write!(f, ", ")?;
                    }
                    write!(f, "{}", v)?;
                }
                write!(f, "]")
            }
            BaseValue::Object(map) => {
                write!(f, "{}", serde_json::Value::Object(map.clone()))
            }
            BaseValue::Null => write!(f, "null"),
        }
    }
}

/// 带信任标记的值
///
/// 所有通过 workflow 传递的值都带有信任标记。
/// - `Untrusted`: 来自外部输入（前端用户请求等）
/// - `Trusted`: 来自后端服务内部生成
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(tag = "trust")]
#[ts(export)]
pub enum WorkflowValue {
    /// 不可信值 - 来自外部输入（前端、用户请求等）
    Untrusted {
        #[serde(flatten)]
        inner: BaseValue,
    },
    /// 可信值 - 来自后端服务生成
    Trusted {
        #[serde(flatten)]
        inner: BaseValue,
        /// 可选：生成此值的服务名称
        #[serde(skip_serializing_if = "Option::is_none")]
        source: Option<std::string::String>,
    },
}

impl WorkflowValue {
    /// 创建不可信值
    pub fn untrusted(value: BaseValue) -> Self {
        Self::Untrusted { inner: value }
    }

    /// 创建可信值
    pub fn trusted(value: BaseValue) -> Self {
        Self::Trusted {
            inner: value,
            source: None,
        }
    }

    /// 创建带来源的可信值
    pub fn trusted_from(value: BaseValue, source: &str) -> Self {
        Self::Trusted {
            inner: value,
            source: Some(source.to_string()),
        }
    }

    /// 检查是否为可信值
    pub fn is_trusted(&self) -> bool {
        matches!(self, Self::Trusted { .. })
    }

    /// 获取内部基础值的引用
    pub fn inner(&self) -> &BaseValue {
        match self {
            Self::Untrusted { inner } => inner,
            Self::Trusted { inner, .. } => inner,
        }
    }

    /// 获取内部基础值（消耗自身）
    pub fn into_inner(self) -> BaseValue {
        match self {
            Self::Untrusted { inner } => inner,
            Self::Trusted { inner, .. } => inner,
        }
    }

    /// 获取来源服务名称（仅 Trusted 有值）
    pub fn source(&self) -> Option<&str> {
        match self {
            Self::Trusted { source, .. } => source.as_deref(),
            _ => None,
        }
    }

    /// 将不可信值提升为可信值（由服务内部调用）
    pub fn promote(self, source: &str) -> Self {
        match self {
            Self::Untrusted { inner } => Self::Trusted {
                inner,
                source: Some(source.to_string()),
            },
            trusted => trusted, // 已经是可信的，保持不变
        }
    }
}

impl std::fmt::Display for WorkflowValue {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Untrusted { inner } => write!(f, "{}", inner),
            Self::Trusted { inner, source } => {
                if let Some(src) = source {
                    write!(f, "{}[from:{}]", inner, src)
                } else {
                    write!(f, "{}", inner)
                }
            }
        }
    }
}

/// Workflow 值错误
#[derive(Debug, Clone, TS)]
#[ts(export)]
pub enum WorkflowValueError {
    /// 值不可信
    UntrustedValue(std::string::String),
    /// 值不存在
    MissingValue(std::string::String),
    /// 类型不匹配
    TypeMismatch {
        key: std::string::String,
        expected: std::string::String,
        actual: std::string::String,
    },
}

impl std::fmt::Display for WorkflowValueError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::UntrustedValue(key) => write!(f, "Value '{}' is untrusted", key),
            Self::MissingValue(key) => write!(f, "Missing value '{}'", key),
            Self::TypeMismatch {
                key,
                expected,
                actual,
            } => write!(
                f,
                "Type mismatch for '{}': expected {}, got {}",
                key, expected, actual
            ),
        }
    }
}

impl std::error::Error for WorkflowValueError {}

// ============================================================================
// 实现 workflow Value trait
// ============================================================================

impl crate::workflow::Value for BaseValue {
    fn get_type(&self) -> std::string::String {
        match self {
            BaseValue::String(_) => "String".to_string(),
            BaseValue::Number(_) => "Number".to_string(),
            BaseValue::Int(_) => "Int".to_string(),
            BaseValue::Bool(_) => "Bool".to_string(),
            BaseValue::List(_) => "List".to_string(),
            BaseValue::Object(_) => "Object".to_string(),
            BaseValue::Null => "Null".to_string(),
        }
    }

    fn to_string(&self) -> std::string::String {
        // 使用 serde_json 序列化以保证与 serde_json::Value 行为一致
        match self {
            BaseValue::Object(_) => {
                let json_val: serde_json::Value = self.clone().into();
                serde_json::to_string(&json_val).unwrap_or_else(|_| format!("{}", self))
            }
            BaseValue::String(value) => value.clone(),
            BaseValue::Null => "Null".to_string(),
            BaseValue::Bool(value) => value.to_string(),
            BaseValue::Int(value) => value.to_string(),
            BaseValue::Number(value) => value.to_string(),
            BaseValue::List(_) => {
                let json_val: serde_json::Value = self.clone().into();
                serde_json::to_string(&json_val).unwrap_or_else(|_| format!("{}", self))
            }
        }
    }
}

impl crate::workflow::Value for WorkflowValue {
    fn get_type(&self) -> std::string::String {
        match self {
            WorkflowValue::Untrusted { inner } => format!("Untrusted({})", crate::workflow::Value::get_type(inner)),
            WorkflowValue::Trusted { inner, .. } => format!("Trusted({})", crate::workflow::Value::get_type(inner)),
        }
    }

    fn to_string(&self) -> std::string::String {
        crate::workflow::Value::to_string(self.inner())
    }
}