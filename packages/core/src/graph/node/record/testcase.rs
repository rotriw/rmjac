#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct FileIOMethod {
    pub in_file: String,
    pub out_file: String,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub enum JudgeIOMethod {
    Std,
    FileIO(FileIOMethod),
}

impl From<JudgeIOMethod> for String {
    fn from(method: JudgeIOMethod) -> Self {
        match method {
            JudgeIOMethod::Std => "std".to_string(),
            JudgeIOMethod::FileIO(file_io) => format!("file_io:in={},out={}", file_io.in_file, file_io.out_file),
        }
    }
}

impl From<String> for JudgeIOMethod {
    fn from(s: String) -> Self {
        if s.starts_with("file_io:") {
            let parts: Vec<&str> = s[8..].split(',').collect();
            if parts.len() == 2 {
                let in_file = parts[0].split('=').nth(1).unwrap_or("").to_string();
                let out_file = parts[1].split('=').nth(1).unwrap_or("").to_string();
                return JudgeIOMethod::FileIO(FileIOMethod { in_file, out_file });
            }
        }
        JudgeIOMethod::Std
    }
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub enum JudgeDiffMethod {
    IgnoreSpace,
    Strict,
    YesNo,
    SPJ(String)
}

impl From<JudgeDiffMethod> for String {
    fn from(method: JudgeDiffMethod) -> Self {
        match method {
            JudgeDiffMethod::IgnoreSpace => "ignore_space".to_string(),
            JudgeDiffMethod::Strict => "strict".to_string(),
            JudgeDiffMethod::YesNo => "yes_no".to_string(),
            JudgeDiffMethod::SPJ(spj) => format!("spj:{}", spj),
        }
    }
}

impl From<String> for JudgeDiffMethod {
    fn from(s: String) -> Self {
        if s.starts_with("spj:") {
            return JudgeDiffMethod::SPJ(s[4..].to_string());
        }
        match s.as_str() {
            "ignore_space" => JudgeDiffMethod::IgnoreSpace,
            "strict" => JudgeDiffMethod::Strict,
            "yes_no" => JudgeDiffMethod::YesNo,
            _ => JudgeDiffMethod::IgnoreSpace,
        }
    }
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct TestcaseNodePublic {
    pub time_limit: i64,
    pub memory_limit: i64,
    pub in_file: i64,
    pub out_file: i64,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct TestcaseNodePrivate {
    pub io_method: JudgeIOMethod,
    pub diff_method: JudgeDiffMethod
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct TestcaseNodePublicRaw {
    pub time_limit: i64,
    pub memory_limit: i64,
    pub in_file: i64,
    pub out_file: i64,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct TestcaseNodePrivateRaw {
    pub io_method: JudgeIOMethod,
    pub diff_method: JudgeDiffMethod
}

#[derive(Deserialize, Serialize, Debug, Clone, Node)]
pub struct TestcaseNode {
    pub node_id: i64,
    pub public: TestcaseNodePublic,
    pub private: TestcaseNodePrivate,
}

#[derive(Deserialize, Serialize, Debug, Clone, NodeRaw)]
#[node_raw(node_type = "testcase")]
pub struct TestcaseNodeRaw {
    pub public: TestcaseNodePublicRaw,
    pub private: TestcaseNodePrivateRaw,
}

impl From<TestcaseNodeRaw> for ActiveModel {
    fn from(value: TestcaseNodeRaw) -> Self {
        use sea_orm::ActiveValue::{NotSet, Set};
        Self {
            node_id: NotSet,
            time_limit: Set(value.public.time_limit),
            memory_limit: Set(value.public.memory_limit),
            in_file: Set(value.public.in_file),
            out_file: Set(value.public.out_file),
            io_method: Set(value.private.io_method.into()),
            diff_method: Set(value.private.diff_method.into()),
        }
    }
}

impl From<Model> for TestcaseNode {
    fn from(model: Model) -> Self {
        Self {
            node_id: model.node_id,
            public: TestcaseNodePublic {
                time_limit: model.time_limit,
                memory_limit: model.memory_limit,
                in_file: model.in_file,
                out_file: model.out_file,
            },
            private: TestcaseNodePrivate {
                io_method: model.io_method.into(),
                diff_method: model.diff_method.into(),
            },
        }
    }
}

use crate::db;
use crate::graph::node::Node;
use crate::graph::node::NodeRaw;
use chrono::NaiveDateTime;
use db::entity::node::testcase::{ActiveModel, Column, Entity, Model};
use enum_const::EnumConst;
use macro_node_iden::{Node, NodeRaw};
use sea_orm::EntityTrait;
use serde::{Deserialize, Serialize};
use strum_macros::EnumIter;
