use serde::{Deserialize, Serialize};
use crate::pages::record::RecordPage;
use crate::pages::settings::SettingsPage;

#[derive(Debug, Clone, Deserialize, Serialize, ts_rs::TS)]
#[ts(export)]
pub struct Page {
    pub title: String,
    pub description: String,
    pub page_detail: PageType,
}

pub mod settings;
pub mod view;
pub mod record;

#[derive(Debug, Clone, Deserialize, Serialize, ts_rs::TS)]
#[ts(export)]
pub enum PageType {
    SettingsPage(SettingsPage), // 设置提交信息。
    RecordPage(RecordPage), // 记录提交信息。
}