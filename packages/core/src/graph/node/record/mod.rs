#[derive(EnumConst, Copy, Clone, Debug, PartialEq, EnumIter, Deserialize, Serialize)]
pub enum RecordStatus {
    Accepted = 100,
    PartialAccepted = 101,
    WrongAnswer = 200,
    TimeLimitExceeded = 301,
    MemoryLimitExceeded = 302,
    OutputLimitExceeded = 303,
    IdlenessLimitExceeded = 304,
    RuntimeError = 400,
    CompileError = 500,
    DangerousCode = 501,
    RemoteServiceUnknownError = 600, // 我方错误
    SandboxError = 601,
    RemotePlatformRefused = 700,
    RemotePlatformConnectionFailed = 701,
    RemotePlatformUnknownError = 702,
    Waiting = 800,
    UnknownError = 900,
    Deleted = 902,
    OnlyArchived = 1000,
    NotFound = 1001,
    Skipped = 1002,
}
#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct RecordNodePublic {
    pub record_order: i64,
    pub record_score: i64,
    pub record_platform: String,
    pub record_status: RecordStatus,
    pub record_message: String,
    pub record_time: NaiveDateTime,
    pub record_update_time: NaiveDateTime,
    pub code: Option<String>,
    pub code_language: Option<String>,
    pub record_url: Option<String>,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct RecordNodePrivate {
    pub code: String,
    pub code_language: String,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct RecordNodePublicRaw {
    pub record_score: i64,
    pub record_platform: String,
    pub record_url: Option<String>,
    pub record_status: RecordStatus,
    pub record_message: Option<String>,
    pub record_time: NaiveDateTime,
    pub statement_id: i64,
    pub public_status: bool,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct RecordNodePrivateRaw {
    pub code: String,
    pub code_language: String,
}

#[derive(Deserialize, Serialize, Debug, Clone, Node)]
pub struct RecordNode {
    pub node_id: i64,
    pub public: RecordNodePublic,
    pub private: RecordNodePrivate,
}

#[derive(Deserialize, Serialize, Debug, Clone, NodeRaw)]
#[node_raw(node_type = "record")]
pub struct RecordNodeRaw {
    pub public: RecordNodePublicRaw,
    pub private: RecordNodePrivateRaw,
}

impl From<RecordNodeRaw> for ActiveModel {
    fn from(value: RecordNodeRaw) -> Self {
        use sea_orm::ActiveValue::{NotSet, Set};
        Self {
            node_id: NotSet,
            record_order: NotSet,
            record_score: Set(value.public.record_score),
            record_platform: Set(value.public.record_platform),
            record_status: Set(value.public.record_status.into()),
            record_message: Set(value.public.record_message),
            record_time: Set(value.public.record_time),
            record_update_time: Set(value.public.record_time),
            record_url: Set(value.public.record_url),
            code: Set(value.private.code),
            code_language: Set(value.private.code_language),
            public_status: Set(value.public.public_status),
            statement_id: Set(value.public.statement_id),
        }
    }
}

impl From<Model> for RecordNode {
    fn from(model: Model) -> Self {
        Self {
            node_id: model.node_id,
            public: RecordNodePublic {
                record_order: model.record_order,
                record_score: model.record_score,
                record_platform: model.record_platform,
                record_status: model.record_status.into(),
                record_message: model.record_message.unwrap_or_default(),
                record_time: model.record_time,
                record_update_time: model.record_update_time,
                code: if model.public_status {
                    Some(model.code.clone())
                } else {
                    None
                },
                code_language: if model.public_status {
                    Some(model.code_language.clone())
                } else {
                    None
                },
                record_url: model.record_url,
            },
            private: RecordNodePrivate {
                code: model.code,
                code_language: model.code_language,
            },
        }
    }
}

use crate::db;
use crate::graph::node::Node;
use crate::graph::node::NodeRaw;
use chrono::NaiveDateTime;
use db::entity::node::record::{ActiveModel, Column, Entity, Model};
use enum_const::EnumConst;
use macro_node_iden::{Node, NodeRaw};
use sea_orm::EntityTrait;
use serde::{Deserialize, Serialize};
use strum_macros::EnumIter;
use std::fmt;

pub mod subtask;
pub mod testcase;

impl From<i64> for RecordStatus {
    fn from(value: i64) -> Self {
        match value {
            100 => RecordStatus::Accepted,
            101 => RecordStatus::PartialAccepted,
            200 => RecordStatus::WrongAnswer,
            301 => RecordStatus::TimeLimitExceeded,
            302 => RecordStatus::MemoryLimitExceeded,
            303 => RecordStatus::OutputLimitExceeded,
            304 => RecordStatus::IdlenessLimitExceeded,
            400 => RecordStatus::RuntimeError,
            500 => RecordStatus::CompileError,
            501 => RecordStatus::DangerousCode,
            600 => RecordStatus::RemoteServiceUnknownError,
            601 => RecordStatus::SandboxError,
            700 => RecordStatus::RemotePlatformRefused,
            701 => RecordStatus::RemotePlatformConnectionFailed,
            702 => RecordStatus::RemotePlatformUnknownError,
            800 => RecordStatus::Waiting,
            900 => RecordStatus::UnknownError,
            902 => RecordStatus::Deleted,
            1000 => RecordStatus::OnlyArchived,
            _ => RecordStatus::UnknownError,
        }
    }
}

impl From<RecordStatus> for i64 {
    fn from(status: RecordStatus) -> Self {
        status.get_const_isize().unwrap_or(900) as i64
    }
}

impl fmt::Display for RecordStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            RecordStatus::Accepted => write!(f, "Accepted"),
            RecordStatus::PartialAccepted => write!(f, "Partial Accepted"),
            RecordStatus::WrongAnswer => write!(f, "Wrong Answer"),
            RecordStatus::TimeLimitExceeded => write!(f, "Time Limit Exceeded"),
            RecordStatus::MemoryLimitExceeded => write!(f, "Memory Limit Exceeded"),
            RecordStatus::OutputLimitExceeded => write!(f, "Output Limit Exceeded"),
            RecordStatus::IdlenessLimitExceeded => write!(f, "Idleness Limit Exceeded"),
            RecordStatus::RuntimeError => write!(f, "Runtime Error"),
            RecordStatus::CompileError => write!(f, "Compile Error"),
            RecordStatus::DangerousCode => write!(f, "Dangerous Code"),
            RecordStatus::RemoteServiceUnknownError => write!(f, "Remote Service Unknown Error"),
            RecordStatus::SandboxError => write!(f, "Sandbox Error"),
            RecordStatus::RemotePlatformRefused => write!(f, "Remote Platform Refused"),
            RecordStatus::RemotePlatformConnectionFailed => write!(f, "Remote Platform Connection Failed"),
            RecordStatus::RemotePlatformUnknownError => write!(f, "Remote Platform Unknown Error"),
            RecordStatus::Waiting => write!(f, "Waiting"),
            RecordStatus::UnknownError => write!(f, "Unknown Error"),
            RecordStatus::Deleted => write!(f, "Deleted"),
            RecordStatus::OnlyArchived => write!(f, "OnlyArchived"),
            RecordStatus::NotFound => write!(f, "NotFound"),
            RecordStatus::Skipped => write!(f, "Skipped"),
        }
    }
}

impl From<String> for RecordStatus {
    fn from(s: String) -> Self {
        match s.as_str() {
            "Accepted" => RecordStatus::Accepted,
            "Partial Accepted" => RecordStatus::PartialAccepted,
            "Wrong Answer" => RecordStatus::WrongAnswer,
            "Time Limit Exceeded" => RecordStatus::TimeLimitExceeded,
            "Memory Limit Exceeded" => RecordStatus::MemoryLimitExceeded,
            "Output Limit Exceeded" => RecordStatus::OutputLimitExceeded,
            "Runtime Error" => RecordStatus::RuntimeError,
            "Compile Error" => RecordStatus::CompileError,
            "Dangerous Code" => RecordStatus::DangerousCode,
            "Remote Service Unknown Error" => RecordStatus::RemoteServiceUnknownError,
            "Sandbox Error" => RecordStatus::SandboxError,
            "Remote Platform Refused" => RecordStatus::RemotePlatformRefused,
            "Remote Platform Connection Failed" => RecordStatus::RemotePlatformConnectionFailed,
            "Remote Platform Unknown Error" => RecordStatus::RemotePlatformUnknownError,
            "Waiting" => RecordStatus::Waiting,
            "Unknown Error" => RecordStatus::UnknownError,
            "Deleted" => RecordStatus::Deleted,
            "OnlyArchived" => RecordStatus::OnlyArchived,
            "Skipped" => RecordStatus::Skipped,
            _ => RecordStatus::UnknownError,
        }
    }
}
