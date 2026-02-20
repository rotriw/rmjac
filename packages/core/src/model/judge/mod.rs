use sea_orm::FromJsonQueryResult;
use serde::{Deserialize, Serialize};
use crate::model::record::JudgeStatus;
use crate::service::save::Savable;

#[derive(Debug, Clone, Deserialize, Serialize, ts_rs::TS)]
#[ts(export)]
#[serde(tag = "type")]
pub enum SubtaskDetail {
    ContestID { // 此节点为 vjudge 节点。
        contest: String,
        problem: String,
    },
    ProblemOnly {
        problem: String,
    },
    // LocalJudge { TODO: local judge. option.
    //
    // }
}

#[derive(Debug, Clone, Deserialize, Serialize, ts_rs::TS)]
#[ts(export)]
pub enum TestcaseDetail {
    HaveTestcaseData {
        input_link: String,
        output_link: String,
    },
    NoExtraData
}

#[derive(Debug, Clone, Deserialize, Serialize, ts_rs::TS)]
#[ts(export)]
pub struct JudgeLimit {
    pub time_limit: i64,
    pub memory_limit: i64,
}

#[derive(Debug, Clone, Deserialize, Serialize, ts_rs::TS)]
#[ts(export)]
pub struct Subtask {
    pub name: String,
    pub uuid: String,
    pub limit: JudgeLimit,
    pub option_platform: String, // judge 使用的平台。
    pub detail: SubtaskDetail,
}

#[derive(Debug, Clone, Deserialize, Serialize, ts_rs::TS)]
#[ts(export)]
pub struct Testcase {
    pub name: String,
    pub uuid: String,
    pub limit: JudgeLimit,
    pub detail: TestcaseDetail,
}

#[derive(Debug, Clone, Deserialize, Serialize, ts_rs::TS, PartialEq, FromJsonQueryResult)]
#[ts(export)]
pub enum JudgeMethod {
    RemoteJudge,
    Unknown,
}


#[derive(Debug, Clone, Deserialize, Serialize, ts_rs::TS, PartialEq, FromJsonQueryResult)]
#[ts(export)]
pub struct JudgeInfo {
    pub judge_method: JudgeMethod,
    pub status: JudgeStatus,
    pub time: i64,
    pub memory: i64,
    pub score: f64,
    pub passed: bool,
}

impl Savable for Subtask {}
impl Savable for Testcase {}
