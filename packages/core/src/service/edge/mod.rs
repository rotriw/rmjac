use crate::Result;
use crate::model::event::Event;
use crate::model::problem::Problem;
use crate::model::record::{JudgeStatus, Record, RemoteJudgeInfo};
use crate::model::vjudge::VjudgeAuth;
use crate::service::save::Saved;
use crate::service::socket::service::exec_task;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct GetContestProp {
    pub platform: String,
}

pub async fn get_contests(platform: &str) -> Result<Vec<Event>> {
    exec_task(
        "get_contests",
        &GetContestProp {
            platform: platform.to_string(),
        },
    )
    .await
}

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct GetProblemProp {
    pub url: String,
}

pub async fn get_problem(url: &str) -> Result<Problem> {
    exec_task(
        "get_problem",
        &GetProblemProp {
            url: url.to_string(),
        },
    )
    .await
}

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct GetProblemEventProp {
    pub platform: String,
    pub event: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct ProblemAttachDetail {
    /// show the problem sign (search index)
    pub sign: String,
    /// iden
    pub iden: Vec<String>,
}

pub async fn get_problems_with_event(
    event: &str,
    platform: &str,
) -> Result<Vec<(Problem, ProblemAttachDetail)>> {
    exec_task(
        "get_problems_event",
        &GetProblemEventProp {
            event: event.to_string(),
            platform: platform.to_string(),
        },
    )
    .await
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, ts_rs::TS)]
#[serde(tag = "type")]
#[ts(export)]
pub enum Range {
    #[serde(rename = "all")]
    All,
    #[serde(rename = "problem")]
    Problem {
        problem_id: String,
        contest_id: Option<String>,
    },
    #[serde(rename = "contest")]
    Contest { contest_id: String },
    #[serde(rename = "recent")]
    Recent { recent: usize },
}

// Only Export to tell vjudge.
#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct SyncListProps {
    pub auth: VjudgeAuth,
    pub range: Range,
    pub platform: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct SyncBack {
    pub score: Option<i64>,
    pub contest_id: Option<String>,
    pub status: JudgeStatus,
    pub passed: bool,
    pub time: Option<i64>,
    pub submission_id: Option<String>,
    pub memory: Option<i64>,
    pub iden: String, // 题目 期望的 event id
    pub language: Option<String>,
    pub code: Option<String>,
    pub detail: Option<Vec<RemoteJudgeInfo>>,
}

impl VjudgeAuth {
    pub async fn sync_list(&self, range: Range, platform: &str) -> Result<Vec<SyncBack>> {
        let res = exec_task(
            "sync_list",
            &SyncListProps {
                auth: self.clone(),
                range,
                platform: platform.to_string(),
            },
        )
        .await?;
        Ok(res)
    }
}
