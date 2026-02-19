use serde::{Deserialize, Serialize};
use crate::service::save::Savable;

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct ProblemLimit {
    pub time_limit: i64,
    pub memory_limit: i64,
}
#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct Problem {
    pub name: String,
    pub description: String,
    pub iden: String,
    pub platform: String,
    pub limit: ProblemLimit,
    pub difficulty: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
pub enum ProblemStatement {
    Markdown(String),
    HTML(String),
    Typst(String),
}


impl Savable for Problem {}
impl Savable for ProblemStatement {}