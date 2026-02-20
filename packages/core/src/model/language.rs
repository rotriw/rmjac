use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub enum Language {
    Chinese,
    English,
    Japanese,
    Russian,
}