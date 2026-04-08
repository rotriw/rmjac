use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct Description {
    pub content: String,
    pub description_type: DescriptionType,
}

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub enum DescriptionType {
    Markdown,
    Html,
    Typst,
}