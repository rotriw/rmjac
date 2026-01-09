use crate::graph::node::record::RecordStatus;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct UniversalSubmission {
    pub remote_id: i64,
    pub remote_platform: String,
    pub remote_problem_id: i64,
    pub language: String,
    pub code: Option<String>,
    pub status: RecordStatus,
    pub message: Option<String>,
    pub score: i64,
    pub submit_time: chrono::NaiveDateTime,
    pub url: String,
    pub problem_iden: String,
}
