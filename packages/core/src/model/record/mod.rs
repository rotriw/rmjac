use chrono::{DateTime, Utc};
use sea_orm::FromJsonQueryResult;
use serde::{Deserialize, Serialize};
use strum_macros::EnumCount;
use crate::model::user::Token;
use crate::service::save::Savable;

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS, EnumCount, FromJsonQueryResult, PartialEq)]
#[ts(export)]
#[repr(i64)]
pub enum JudgeStatus {
    Accepted = 200,
    WrongAnswer = 300,

    TimeLimitExceeded = 400,
    MemoryLimitExceeded = 401,
    RuntimeError = 402,
    CompileError = 500,
    PresentationError = 600,

    Skipped = 601,

    RemoteJudgeServiceError = 900,
    RemoteError = 901,

    Unknown = 998,

    Reject = 999,
}
#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS, Default)]
#[ts(export)]
#[serde(tag = "style")]
pub enum ShowStyle {
    LocalJudge {
        score: f64,
        time: i64,
        memory: i64,
    }, // 本地评测数据。
    RemoteJudge {
        score: f64,
        time: i64,
        memory: i64,
        url: String
    }, // 远程评测数据
    Archive {
        score: f64,
        time: i64,
        memory: i64,
    },
    CFSync {
        total_testcase: i64,
        passed_testcase: i64,
        time: i64,
        memory: i64,
    },
    #[default]
    OnlyPassed, // 只知道是否通过。
    WaitingSync {
        url: String
    }, // 仅包含一个url
}


#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct RemoteJudgeInfo {
    pub is_passed: bool,
    pub testcase_name: String,
    pub status: JudgeStatus,
    pub score: Option<f64>,
    pub time: Option<i64>,
    pub memory: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct JudgeTotal {
    pub is_passed: bool,
    pub status: JudgeStatus,
    pub detail: ShowStyle
}

impl JudgeTotal {
    pub fn get_time(&self) -> i64 {
        match self.detail {
            ShowStyle::CFSync { time, ..}
            | ShowStyle::LocalJudge {time, ..}
            | ShowStyle::RemoteJudge {time, ..}
            | ShowStyle::Archive {time, ..} => { time }
            _ => -1
        }
    }

    pub fn get_memory(&self) -> i64 {
        match self.detail {
            ShowStyle::CFSync { memory, ..}
            | ShowStyle::LocalJudge { memory, ..}
            | ShowStyle::RemoteJudge { memory, ..}
            | ShowStyle::Archive { memory, ..} => { memory }
            _ => -1
        }
    }

}

impl From<JudgeTotal> for f64 {
    fn from(judge_total: JudgeTotal) -> Self {
        if judge_total.is_passed {
            100f64
        } else {
            match judge_total.detail {
                ShowStyle::RemoteJudge { score, .. }
                | ShowStyle::LocalJudge { score, .. }
                | ShowStyle::Archive { score, .. } => score,
                ShowStyle::WaitingSync { .. } | ShowStyle::OnlyPassed | ShowStyle::CFSync {..} => 0f64,
            }
        }
    }

}

/// Basic record is the most basic of record, it must contains the problem id and the score.
#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct BasicRecord {
    pub problem_id: i64,
    pub user_id: i64,
    pub language: String,
    pub judge_detail: JudgeTotal,
    #[ts(type = "String")]
    pub judge_time: DateTime<Utc>,
    pub judge_message: String, // Judge message.
}

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct Record {
    #[ts(flatten)]
    #[serde(flatten)]
    pub basic: BasicRecord,
    pub code: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct DetailTestcase {
    pub status: JudgeStatus,
    pub score: f64,
    pub time: i64,
    pub memory: i64,
    pub detail: Vec<DetailSubtask>
}

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub enum DetailSubtaskChildren {
    Subtask(DetailSubtask),
    Testcase(DetailTestcase)
}

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct DetailSubtask {
    pub status: JudgeStatus,
    pub name: String,
    pub score: f64,
    pub time: i64,
    pub memory: i64,
    pub detail: Vec<DetailSubtaskChildren>
}


impl Savable for BasicRecord {}
impl Savable for Record {}