//! VJudge Status Types
//!
//! 拆分后的状态类型与兼容的 VjudgeStatus 共存，用于逐步迁移。
//!
//! This module defines the status types used in the VJudge workflow system.
//! These types implement the workflow::Status trait and related traits.

use std::collections::HashMap;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use workflow::workflow::{Status, StatusDescribe, StatusRequire, Value, ValueDescribe, ValueType};


// 保护系统。所有前端读入的信息均来自Normal, Inner 部分为内部信任函数结果。
// 使用时如果为 inner: 则仅使用 InnerFunction 否则 会先从 InnerFunction 读取，读取不到再从 Normal 读取。
#[derive(Serialize, Deserialize, Clone)]
pub enum VjudgeStatus {
    Normal(serde_json::Value),
    InnerFunction(serde_json::Value),
    Error(String),
    TaskDone(String)
}

impl Status for VjudgeStatus {
    fn get_value(&self, key: &str) -> Option<Box<dyn Value>> {
        return if key.starts_with("inner:") {
            if let VjudgeStatus::InnerFunction(v) = self {
                serde_json::to_value(v).unwrap().get_value(&key[6..])
            } else {
                None
            }
        } else {
            match self {
                VjudgeStatus::Normal(v) => {
                    serde_json::to_value(v).unwrap().get_value(key)
                }
                VjudgeStatus::InnerFunction(v) => {
                    if let Some(val) = serde_json::to_value(v).unwrap().get_value(key) {
                        Some(val)
                    } else {
                        None
                    }
                }
                VjudgeStatus::Error(x) => {
                    Some(Box::new(x.clone()))
                }
                VjudgeStatus::TaskDone(x) => {
                    Some(Box::new(x.clone()))
                }
            }
        }
    }

    fn get_all_value(&self) -> Vec<(String, Box<dyn Value>)> {
        match self {
            VjudgeStatus::Normal(v) => {
                serde_json::to_value(v).unwrap().get_all_value()
            }
            VjudgeStatus::InnerFunction(v) => {
                serde_json::to_value(v).unwrap().get_all_value()
            }
            VjudgeStatus::Error(x) => {
                vec![("error".to_string(), Box::new(x.clone()) as Box<dyn Value>)]
            }
            VjudgeStatus::TaskDone(x) => {
                vec![("task_done".to_string(), Box::new(x.clone()) as Box<dyn Value>)]
            }
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct VjudgeImportStatus {
    pub platform: Option<String>,
    pub remote_problem_id: Option<String>,
    pub local_problem_id: Option<i64>,
    pub account_id: Option<i64>,
    pub record_id: Option<i64>,
    pub error: Option<String>,
}

impl Status for VjudgeImportStatus {
    fn get_value(&self, key: &str) -> Option<Box<dyn Value>> {
        serde_json::to_value(self).unwrap().get_value(key)
    }

    fn get_all_value(&self) -> Vec<(String, Box<dyn Value>)> {
        serde_json::to_value(self).unwrap().get_all_value()
    }
}

pub enum VjudgeRequireExpr {
    HasKey(String),
    KeyEq(String, String),
    KeyInFunction(String, Box<dyn Fn(&Box<dyn StatusDescribe>) -> bool>, String), // (key, function, description)
    Inner(String),
}

pub struct VjudgeRequire {
    pub inner: Vec<VjudgeRequireExpr>,
}

#[async_trait::async_trait(?Send)]
impl StatusRequire for VjudgeRequire {
    async fn verify(&self, o: &Box<dyn StatusDescribe>) -> bool {
        for expr in &self.inner {
            match expr {
                VjudgeRequireExpr::KeyEq(key, value) => {
                    if let Some(v) = o.value(&key).await {
                        let mut maybe_eq =  false;
                        for vd in v {
                            if vd.maybe_eq(value).await {
                                maybe_eq = false;
                                break;
                            }
                        }
                        if maybe_eq == false {
                            return false;
                        }
                    }
                }
                 VjudgeRequireExpr::HasKey(key) => {
                    if o.value(&key).await.is_none() {
                        return false;
                    }
                }
                VjudgeRequireExpr::KeyInFunction(key, func, _) => {
                    if !func(o) {
                        return false;
                    }
                }
                VjudgeRequireExpr::Inner(k) => {
                    if o.value(format!("inner:{}", k).as_str()).await.is_none() {
                        return false;
                    }
                }
            }
        }
        true
    }

    fn describe(&self) -> String {
        let mut descriptions = Vec::new();
        for expr in &self.inner {
            match expr {
                    VjudgeRequireExpr::KeyEq(key, value) => descriptions.push(format!("Import must have '{}', and it should be '{}'", key, value)),
                VjudgeRequireExpr::HasKey(key) => descriptions.push(format!("Import must have '{}'", key)),
                VjudgeRequireExpr::KeyInFunction(_, _, desc) => descriptions.push(desc.clone()),
                VjudgeRequireExpr::Inner(desc) => descriptions.push(format!("Inner Function Should export key:{}", desc)),
            }
        }
        descriptions.join("; \n")
    }
}

// TODO: let specific value into V.
#[derive(Clone)]
pub enum VjudgeExportDescribeExpr {
    SpecificValue(String), // 知道准确的多种可能的值
    OnlyType(String), // 只知道类型。
    Has,// 只知道具体类型。
}

#[async_trait::async_trait(?Send)]
impl ValueDescribe for VjudgeExportDescribeExpr {
    fn get_type(&self) -> ValueType {
        ValueType::Others("any".to_string()) // TODO: let it right.
    }

    async fn maybe_eq(&self, o: &str) -> bool {
        if let VjudgeExportDescribeExpr::SpecificValue(v) = self {
            return v == o;
        }
        true // TODO: 这里也很幽默啊！没匹配类型。累了。这个可以分布处理的。
    }

    async fn has_str(&self, s: &str) -> bool {
        if let VjudgeExportDescribeExpr::SpecificValue(v) = self {
            return v == s;
        }
        true
    }

    async fn number(&self, _x: i64) -> bool {
        if let VjudgeExportDescribeExpr::OnlyType(t) = self {
            return t == "number";
        }
        true
    }
}

// 函数可能导出的描述。
pub struct VjudgeExportDescribe {
    pub inner: Vec<HashMap<String, Vec<VjudgeExportDescribeExpr>>>,
}

#[async_trait::async_trait(?Send)]
impl StatusDescribe for VjudgeExportDescribe {
    async fn value(&self, key: &str) -> Option<Vec<Box<dyn ValueDescribe>>> {
        let mut res: Vec<Box<dyn ValueDescribe>>  = Vec::new();
        for map in &self.inner {
            if let Some(exprs) = map.get(key) {
                for expr in exprs {
                    res.push(Box::new(expr.clone()));
                }
            }
        }
        Some(res)
    }
}