use std::collections::HashMap;

use crate::workflow::{StatusDescribe, StatusRequire, ValueDescribe, ValueType};

// ============================================================================
// WorkflowRequire
// ============================================================================

pub enum WorkflowRequireExpr {
    HasKey(String),
    KeyEq(String, String),
    Custom {
        desc: String,
        validator: Box<dyn Fn(&Box<dyn StatusDescribe>) -> bool + Send + Sync>,
    },
}

pub struct WorkflowRequire {
    requirements: Vec<WorkflowRequireExpr>,
}

impl WorkflowRequire {
    pub fn new() -> Self {
        Self {
            requirements: Vec::new(),
        }
    }

    pub fn with_key(mut self, key: impl Into<String>) -> Self {
        self.requirements
            .push(WorkflowRequireExpr::HasKey(key.into()));
        self
    }

    pub fn with_inner_key(self, key: impl Into<String>) -> Self {
        self.with_key(format!("inner:{}", key.into()))
    }

    pub fn with_value(mut self, key: impl Into<String>, value: impl Into<String>) -> Self {
        self.requirements
            .push(WorkflowRequireExpr::KeyEq(key.into(), value.into()));
        self
    }

    pub fn with_custom(
        mut self,
        desc: impl Into<String>,
        validator: impl Fn(&Box<dyn StatusDescribe>) -> bool + Send + Sync + 'static,
    ) -> Self {
        self.requirements.push(WorkflowRequireExpr::Custom {
            desc: desc.into(),
            validator: Box::new(validator),
        });
        self
    }

    pub fn extend(mut self, other: WorkflowRequire) -> Self {
        self.requirements.extend(other.requirements);
        self
    }
}

impl Default for WorkflowRequire {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait::async_trait(?Send)]
impl StatusRequire for WorkflowRequire {
    async fn verify(&self, o: &Box<dyn StatusDescribe>) -> bool {
        for req in &self.requirements {
            match req {
                WorkflowRequireExpr::HasKey(k) => {
                    if o.value(k).await.is_none() {
                        return false;
                    }
                }
                WorkflowRequireExpr::KeyEq(k, v) => {
                    if let Some(values) = o.value(k).await {
                        let mut possible = false;
                        for vd in values {
                            if vd.maybe_eq(v).await {
                                possible = true;
                                break;
                            }
                        }
                        if !possible {
                            return false;
                        }
                    } else {
                        return false;
                    }
                }
                WorkflowRequireExpr::Custom { validator, .. } => {
                    if !validator(o) {
                        return false;
                    }
                }
            }
        }
        true
    }

    fn describe(&self) -> String {
        if self.requirements.is_empty() {
            return "No requirements".to_string();
        }
        self.requirements
            .iter()
            .map(|req| match req {
                WorkflowRequireExpr::HasKey(k) => format!("Must have key '{}'", k),
                WorkflowRequireExpr::KeyEq(k, v) => format!("Key '{}' must be '{}'", k, v),
                WorkflowRequireExpr::Custom { desc, .. } => desc.clone(),
            })
            .collect::<Vec<_>>()
            .join("; \n")
    }
}

// ============================================================================
// WorkflowExportDescribe
// ============================================================================

#[derive(Clone)]
pub enum WorkflowValueDescribe {
    Any,
    Type(String),
    Specific(String),
}

#[async_trait::async_trait(?Send)]
impl ValueDescribe for WorkflowValueDescribe {
    fn get_type(&self) -> ValueType {
        match self {
            Self::Type(t) => ValueType::Others(t.clone()),
            Self::Specific(_) => ValueType::String,
            Self::Any => ValueType::Others("any".to_string()),
        }
    }

    async fn maybe_eq(&self, o: &str) -> bool {
        match self {
            Self::Any => true,
            Self::Type(_) => true,
            Self::Specific(v) => v == o,
        }
    }

    async fn has_str(&self, s: &str) -> bool {
        match self {
            Self::Specific(v) => v == s,
            _ => true,
        }
    }

    async fn number(&self, _x: i64) -> bool {
        match self {
            Self::Type(t) => t == "number",
            _ => true,
        }
    }

    fn describe(&self) -> String {
        match self {
            Self::Any => "Any value".to_string(),
            Self::Type(t) => format!("Type {}", t),
            Self::Specific(s) => format!("Value '{}'", s),
        }
    }
}

pub struct WorkflowExportDescribe {
    outputs: HashMap<String, Vec<WorkflowValueDescribe>>,
}

impl WorkflowExportDescribe {
    pub fn new() -> Self {
        Self {
            outputs: HashMap::new(),
        }
    }

    pub fn add(mut self, key: impl Into<String>, desc: WorkflowValueDescribe) -> Self {
        self.outputs.entry(key.into()).or_default().push(desc);
        self
    }

    pub fn add_has(self, key: impl Into<String>) -> Self {
        self.add(key, WorkflowValueDescribe::Any)
    }

    pub fn add_type(self, key: impl Into<String>, type_name: impl Into<String>) -> Self {
        self.add(key, WorkflowValueDescribe::Type(type_name.into()))
    }

    pub fn add_specific_value(self, key: impl Into<String>, value: impl Into<String>) -> Self {
        self.add(key, WorkflowValueDescribe::Specific(value.into()))
    }

    pub fn add_inner_has(self, key: impl Into<String>) -> Self {
        self.add_has(format!("inner:{}", key.into()))
    }
}

impl Default for WorkflowExportDescribe {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait::async_trait(?Send)]
impl StatusDescribe for WorkflowExportDescribe {
    async fn value(&self, key: &str) -> Option<Vec<Box<dyn ValueDescribe>>> {
        if let Some(list) = self.outputs.get(key) {
            Some(
                list.iter()
                    .map(|d| Box::new(d.clone()) as Box<dyn ValueDescribe>)
                    .collect(),
            )
        } else {
            None
        }
    }

    async fn describe(&self) -> String {
        let mut parts = Vec::new();
        for (k, v) in &self.outputs {
            let descs: Vec<String> = v.iter().map(|d| d.describe()).collect();
            parts.push(format!("{}: [{}]", k, descs.join(", ")));
        }
        if parts.is_empty() {
            "No exports".to_string()
        } else {
            parts.join("; ")
        }
    }
}
