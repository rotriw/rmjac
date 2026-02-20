use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};
use crate::model::content::Description;
use crate::model::problem::{Problem, ProblemStatement};
use crate::model::record::{JudgeStatus, Record};
use crate::model::user::User;
use crate::service::problem::ProblemView;
use crate::service::record::query::QueryRecord;
use crate::service::save::{ManageService, Saved};


#[derive(Debug, Clone, Deserialize, Serialize, ts_rs::TS)]
pub struct UserProblemStatus {
    pub max_score: f64,
    pub status: JudgeStatus,
    pub history_submit: Vec<Saved<Record>>
}

#[derive(Debug, Clone, Deserialize, Serialize, ts_rs::TS)]
#[ts(export)]
pub struct ProblemPage {
    pub problem_name: String,
    pub own_statement: Vec<Saved<ProblemStatement>>,
    pub user_status: Option<UserProblemStatus>
}

pub async fn render(node_id: i64, user_id: Option<i64>, db: &DatabaseConnection) -> ProblemPage {
    let problem = Saved::<Problem>::get(node_id).await.unwrap();
    let statement = problem.get_statements(db).await;
    let user_status = if let Some(user_id) = user_id {
        let user = Saved::<User>::get(user_id).await.unwrap();
        let history_submit = user.query_problem_submission(db, node_id).await.unwrap();
        if history_submit.is_empty() {
            None
        } else {
            Some(UserProblemStatus {
                max_score: user.get_max_score(db, node_id).await.unwrap_or(-1.00),
                status: JudgeStatus::Accepted,
                history_submit
            })
        }
    } else {
        None
    };
    ProblemPage {
        problem_name: problem.data.name,
        own_statement: statement,
        user_status
    }
}