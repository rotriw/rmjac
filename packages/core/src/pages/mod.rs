use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};
use crate::model::user::User;
use crate::pages::problem::ProblemPage;
use crate::pages::record::RecordPage;
use crate::pages::settings::SettingsPage;
use crate::pages::user::UserPage;
use crate::service::user::BasicUserInfo;

#[derive(Debug, Clone, Deserialize, Serialize, ts_rs::TS)]
#[ts(export)]
pub enum PageType {
    SettingsPage(SettingsPage), // 设置提交信息。
    RecordPage(RecordPage), // 记录提交信息。
    UserPage(UserPage),
    ProblemPage(ProblemPage)
}

#[derive(Debug, Clone, Deserialize, Serialize, ts_rs::TS)]
#[ts(export)]
pub struct UserDetail {
    pub user_iden: String,
    pub email: String,
    pub solved_problems: Vec<String>,
    pub unsolved_problems: Vec<String>,
}

impl<T: BasicUserInfo> From<T> for UserDetail {
    fn from(user_info: T) -> Self {
        Self {
            user_iden: user_info.get_iden().unwrap(),
            email: user_info.get_email().unwrap(),
            solved_problems: vec![],
            unsolved_problems: vec![],
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize, ts_rs::TS)]
#[ts(export)]
pub struct Page {
    pub title: String,
    pub description: String,
    pub page_detail: Option<PageType>,
    pub user_detail: Option<UserDetail>
}


use crate::Result;
use crate::service::save::{ManageService, Saved};

pub async fn render_page(db: &DatabaseConnection, view_page: &str, node_id: i64, user_id: Option<i64>) -> Result<Page> {
    let user_detail = if let Some(user_id) = user_id {
        let user = Saved::<User>::get(user_id).await?;
        Some(UserDetail::from(user.data))
    } else {
        None
    };
    Ok(match view_page {
        "user" => {
            Page {
                title: "用户详情".to_string(),
                description: format!("ID={}", node_id),
                page_detail: Some(PageType::UserPage(user::render(node_id, db).await)),
                user_detail
            }
        },
        "problem" => {
            Page {
                title: "题目详情".to_string(),
                description: format!("ID={}", node_id),
                page_detail: Some(PageType::ProblemPage(problem::render(node_id, user_id, db).await)),
                user_detail
            }
        },
        _ => {
            Page {
                title: "unknown_view".to_string(),
                description: "unknown_view".to_string(),
                page_detail: None,
                user_detail: None
            }
        }
    })
}

pub mod settings;
pub mod view;
pub mod record;
pub mod user;
pub mod problem;