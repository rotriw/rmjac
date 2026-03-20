use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub enum Select {
    Group {
        name: String,
        description: String,
        context: Vec<Select>
    },
    StringInput {
        name: String,
        placeholder: String,
        description: String
    },
    Selection {
        name: String,
        options: Vec<String>,
        description: String
    }
}