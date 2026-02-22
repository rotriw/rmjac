use serde::{Deserialize, Serialize};
use crate::model::event::Event;
use crate::Result;
use crate::model::problem::Problem;
use crate::model::record::{Record, RemoteJudgeInfo};
use crate::model::vjudge::VjudgeAuth;
use crate::service::iden::WithIden;
use crate::service::save::Saved;
use crate::service::socket::service::exec_task;

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct GetContestProp {
    pub platform: String,
}

pub async fn get_contests(platform: &str) -> Result<Vec<Event>> {
    exec_task("get_contests", &GetContestProp {
        platform: platform.to_string(),
    }).await
}

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct GetProblemProp {
    pub url: String,
}


pub async fn get_problem(url: &str) -> Result<Problem> {
    exec_task("get_problem", &GetProblemProp {
        url: url.to_string(),
    }).await
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
    Contest {
        contest_id: String,
    },
    #[serde(rename = "recent")]
    Recent {
        recent: usize,
    }
}

pub trait SyncList {
    fn sync_list(&self, range: Range) -> impl Future<Output = Result<(Record, Option<Vec<RemoteJudgeInfo>>)>>;
}

// Only Export to tell vjudge.
#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct SyncListProps {
    pub auth: VjudgeAuth,
    pub range: Range,
}

impl SyncList for VjudgeAuth {
    async fn sync_list(&self, range: Range) -> Result<(Record, Option<Vec<RemoteJudgeInfo>>)> {
        let res = exec_task("sync_list", &SyncListProps {
            auth: self.clone(),
            range
        }).await?;
        Ok(res)
    }

}