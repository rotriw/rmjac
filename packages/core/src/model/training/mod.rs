use serde::{Deserialize, Serialize};
use crate::model::content::Description;
use crate::service::save::Savable;

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct Training {
    pub iden: String,
    pub name: String,
    pub description: Description,
    pub joined_description: Description,
    pub creation_time: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub enum TrainingItemContent {
    Problem(i64), // problem id
    TrainingList(String), // Training uuid
    // PresetTraining TODO: PresetTraining
}

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct TrainingItem {
    pub uuid: String, // the item only method.
    pub order: i64, // order in training.
    pub description: Description,
    pub content: TrainingItemContent,
}

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub enum TrainingItemRecursive {
    Problem(i64), // problem id
    TrainingList(String, Vec<TrainingItemRecursive>), // Training uuid and its items.
    // PresetTraining TODO: PresetTraining
}

impl Savable for Training {}
impl Savable for TrainingItem {}
