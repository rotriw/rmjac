use sea_orm::{ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QuerySelect};
use serde::{Deserialize, Serialize};
use crate::db::entity::edge::search::ActiveModel as SearchActiveModel;
use crate::Result;
pub trait AddToSearch {
    fn set_can_search(&self, db: &DatabaseConnection) -> impl Future<Output = Result<()>>;
}

impl<T> AddToSearch for T where T: Clone + Into<SearchActiveModel> {
    async fn set_can_search(&self, db: &DatabaseConnection) -> Result<()> {
        let search_model: SearchActiveModel = self.clone().into();
        search_model.save(db).await?;
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct SearchOption {
    pub difficulty_range: Option<(i32, i32)>,
    pub content: Option<String>, // 文本部分 (去除空格)
    pub is_specific: bool, // 是否精确匹配
    pub specific_platform: Vec<String>, // 需要匹配的平台列表
    pub specific_type: Vec<String>, // 需要匹配的类型列表
    pub number: Option<u64>, // 返回结果数量限制
    pub offset: Option<u64>, // 分页参数，表示返回第几页的结果
}

pub fn analyze_search_content(content: &str) -> SearchOption {
    let mut now_content = content.to_string();
    let mut res = SearchOption {
        difficulty_range: None,
        content: None,
        is_specific: false,
        specific_platform: vec![],
        specific_type: vec![],
        number: None,
        offset: None,
    };
    if content.contains("+event") {
        res.specific_type.push("event".to_string());
        now_content.replace("+event", "");
    }
    if content.contains("+problem") {
        res.specific_type.push("problem".to_string());
        now_content.replace("+problem", "");
    }
    // find all @platform with regex.
    let re = regex::Regex::new(r"@(\w+)").unwrap();
    for cap in re.captures_iter(content) {
        res.specific_platform.push(cap[1].to_string());
        now_content.replace(&format!("@{}", &cap[1]), "");
    }
    if content.contains("+specific") {
        res.is_specific = true;
        now_content.replace("+specific", "");
    }
    let re = regex::Regex::new(r"diff-number:(\d+)-(\d+)").unwrap();
    if let Some(cap) = re.captures(content) {
        res.difficulty_range = Some((cap[1].parse().unwrap_or(0), cap[2].parse().unwrap_or(0)));
        now_content.replace(&format!("diff-number:{}-{}", &cap[1], &cap[2]), "");
    }
    // 匹配难度 diff-number:<number>
    let re = regex::Regex::new(r"diff-number:(\d+)").unwrap();
    if let Some(cap) = re.captures(content) {
        res.difficulty_range = Some((cap[1].parse().unwrap_or(0), cap[1].parse().unwrap_or(0)));
        now_content.replace(&format!("diff-number:{}", &cap[1]), "");
    }
    // 匹配难度 *<难度>
    let re = regex::Regex::new(r"\*(\d+)").unwrap();
    if let Some(cap) = re.captures(content) {
        res.difficulty_range = Some((cap[1].parse().unwrap_or(0), cap[1].parse().unwrap_or(0)));
        now_content.replace(&format!("*{}", &cap[1]), "");
    }
    let content = now_content.trim().to_string();
    res.content = if content.is_empty() {
        None
    } else {
        Some(content)
    };
    res
}





use crate::db::entity::edge::search::*;
pub async fn analyze_search(db: &DatabaseConnection, content: &str, offset: u64, number: u64) -> Result<(Vec<Model>, SearchOption)> {
    let mut option = analyze_search_content(content);
    let mut query = Entity::find();
    if let Some((min_diff, max_diff)) = option.difficulty_range {
        query = query.filter(Column::Difficulty.between(min_diff, max_diff));
    }
    if let Some(content) = option.content.clone() {
        if option.is_specific {
            query = query.filter(Column::Content.eq(content));
        } else {
            query = query.filter(Column::Content.contains(content));
        }
    }
    if !option.specific_platform.is_empty() {
        query = query.filter(Column::Platform.is_in(option.specific_platform.clone()));
    }
    if !option.specific_type.is_empty() {
        query = query.filter(Column::Typed.is_in(option.specific_type.clone()));
    }
    query = query.offset(offset).limit(number);
    option.offset = Some(offset);
    option.number = Some(number);
    Ok((vec![], option))
}

pub mod impled;