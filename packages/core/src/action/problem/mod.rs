use sea_orm::{ActiveModelTrait, DatabaseConnection, NotSet, Set};
use serde::{Deserialize, Serialize};
use tap::Conv;
use crate::model::problem::{Problem, ProblemStatement};
use crate::model::user::User;
use crate::Result;
use crate::service::perm::View;
use crate::service::save::{SaveService, Saved};
use crate::db::entity::edge;
use crate::service::perm::provider::{Manage, ManagePermService};
use crate::service::user::BasicUserInfo;

#[derive(Clone, Debug, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct CreateOption {
    pub is_public: bool,
    pub is_login: bool,
}
pub async fn create_problem(db: &DatabaseConnection, owner_id: i64, problem: &Problem, create_option: CreateOption) -> Result<Saved<Problem>> {
    let problem_saved = problem.save().await?;
    log::debug!("Problem Add started.");
    ManagePermService::add(owner_id, problem_saved.id, Manage::All, db).await;
    if create_option.is_public {
        problem_saved.set_public_view(db).await?;
    }
    if create_option.is_login {
        problem_saved.set_guest_view(db).await?;
    }
    log::debug!("Problem created.");
    Ok(problem_saved)
}

pub async fn create_statement(db: &DatabaseConnection, problem: &Saved<Problem>, statement: &ProblemStatement) -> Result<Saved<ProblemStatement>> {
    let statement_saved = statement.save().await?;
    problem.attach_statement(db, &statement_saved).await?;
    Ok(statement_saved)
}