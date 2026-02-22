use serde::{Deserialize, Serialize};
use crate::model::content::Description;
use crate::model::language::Language;
use crate::service::save::Savable;

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub enum LuoguStyleDifficulty {
    P0, // 灰
    P1, // 红
    P2, // 橙
    P3, // 黄
    P4, // 绿
    P5, // 蓝
    P6, // 紫
    P7, // 黑
}

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub enum Difficulty {
    NumberStyle(i64),
    LuoguStyle(LuoguStyleDifficulty)
}

// 这并不是一个很好的做法，应该使用魔术数字。
impl From<Difficulty> for i64 {
    fn from(difficulty: Difficulty) -> Self {
        match difficulty {
            Difficulty::NumberStyle(num) => num,
            Difficulty::LuoguStyle(luogu_difficulty) => match luogu_difficulty {
                LuoguStyleDifficulty::P0 => -1,
                LuoguStyleDifficulty::P1 => 800,
                LuoguStyleDifficulty::P2 => 2,
                LuoguStyleDifficulty::P3 => 3,
                LuoguStyleDifficulty::P4 => 4,
                LuoguStyleDifficulty::P5 => 5,
                LuoguStyleDifficulty::P6 => 6,
                LuoguStyleDifficulty::P7 => 7,
            }
        }
    }

}

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
    pub description: Description,
    pub platform: String,
    pub limit: ProblemLimit,
    pub difficulty: Difficulty,
    pub is_remote: bool,
    pub is_sync: bool,
    pub sync_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct ProblemStatement {
    pub statement_type: ProblemStatementType,
    pub content: String,
    pub is_translate: bool,
    pub language: Language,
}

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub enum ProblemStatementType {
    Markdown,
    Html,
    Pdf,
    Typst,
}

impl Savable for Problem {}
impl Savable for ProblemStatement {}