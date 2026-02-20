use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};
use crate::model::content::Description;
use crate::model::problem::Problem;
use crate::model::record::JudgeStatus;
use crate::model::user::User;
use crate::service::record::query::QueryRecord;
use crate::service::save::{ManageService, Saved};

#[derive(Debug, Clone, Deserialize, Serialize, ts_rs::TS)]
#[ts(export)]
pub struct UserPage {
    pub name: String,
    pub email: String,
    pub avatar: String,
    pub description: Description,
    pub passed_problem: Vec<Saved<Problem>>,
}

pub async fn render(node_id: i64, db: &DatabaseConnection) -> UserPage {
    let user = Saved::<User>::get(node_id).await.unwrap();
    let passed = user.query_status_submission(db, JudgeStatus::Accepted).await;
    UserPage {
        name: user.data.name,
        email: user.data.email,
        avatar: user.data.avatar,
        description: user.data.description,
        passed_problem: passed.unwrap_or(vec![])
    }
}