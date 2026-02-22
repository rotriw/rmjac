use sea_orm::prelude::DateTimeUtc;
use serde::{Deserialize, Serialize};
use crate::model::content::Description;
use crate::model::language::Language;
use crate::service::save::Savable;

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub enum EventStatus {
    NotStarted,
    Ongoing,
    CFSystemTest,
    Ended,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, ts_rs::TS)]
#[ts(export)]
pub enum EventType {
    OnlineContest,
    OfflineContest,
    ProblemSet,
    RemotePlatform,
    Other,
}

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub enum ContestType {
    OI,
    XCPC,
    IOI,
    CF,
    AT,
}

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub enum EventParent {
    ID(i64),
    String(String),
}

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct Event {
    pub owned_by: EventParent, // 隶属于的活动。
    pub name: String,
    pub iden_list: Vec<String>,
    pub event_type: EventType,
    pub description: Description,
    pub contest_type: Option<ContestType>,
    pub language: Language,
    #[ts(type = "string | null")]
    pub start_time: Option<DateTimeUtc>,
    #[ts(type = "string | null")]
    pub end_time: Option<DateTimeUtc>,
    pub event_status: EventStatus,
    pub event_url: Option<String>,
}

impl Savable for Event {}