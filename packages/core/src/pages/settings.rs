use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, Deserialize, Serialize, ts_rs::TS)]
#[ts(export)]
pub struct SettingsPage {
}

pub fn render() -> SettingsPage {
    SettingsPage::default()
}