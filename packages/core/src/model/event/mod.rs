use derive_more::Display;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::prelude::DateTimeUtc;
use serde::{Deserialize, Serialize};
use crate::db::SearchEdgeActiveModel;
use crate::model::content::Description;
use crate::model::language::Language;
use crate::service::save::{IdInfo, Savable, Saved};

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

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS, PartialEq)]
#[ts(export)]
pub enum ContestType {
    OI,
    XCPC,
    IOI,
    CF,
    AT,
}


#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS, Display)]
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
    pub sign: Option<String>, // only for search, cannot to redirect.
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


/*
成功将某种物品带上标签时会基于此标号。
 */
#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct EventIden<T> {
    pub iden: String,
    pub id: i64,
    pub data: T,
}

impl<T> IdInfo for EventIden<T> {
    fn get_id(&self) -> i64 {
        self.id
    }
}

impl<T> From<EventIden<T>> for Saved<T> {
    fn from(value: EventIden<T>) -> Self {
        Saved {
            id: value.id,
            data: value.data,
        }
    }

}


impl Savable for Event {}

impl Into<SearchEdgeActiveModel> for EventIden<Event> {
    fn into(self) -> SearchEdgeActiveModel {
        SearchEdgeActiveModel {
            edge_id: NotSet,
            id: Set(self.id),
            difficulty: NotSet,
            content: Set(self.data.description.content),
            name: Set(self.data.name),
            iden: Set(self.iden),
            typed: Set("event".to_string()),
            platform: Set(self.data.owned_by.to_string()),
        }
    }
}