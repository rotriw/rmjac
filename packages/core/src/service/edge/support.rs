use serde::{Deserialize, Serialize};
use crate::model::record::BasicRecord;
use crate::model::vjudge::{Vjudge, VjudgeAuth};

#[derive(Serialize, Deserialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
#[ts(tag = "operation", rename_all = "camelCase")]
pub enum EdgeAction {
    SyncOne(BasicRecord),
    SyncList {
        start: i64,
        end: i64
    },
    Verified {
        id: String,
    }
}

#[derive(Serialize, Deserialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub struct EdgeTask {
    platform: String,
    vjudge: Vjudge,
    auth: Option<VjudgeAuth>,
    action: EdgeAction,
}