use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, ts_rs::TS)]
#[ts(export)]
pub struct RecordPage {
    // pub record_info: RecordInfo,
    // pub testcase_info: Vec<TestcaseInfo>,
}