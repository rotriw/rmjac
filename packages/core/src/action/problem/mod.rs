use sea_orm::{ActiveModelTrait, DatabaseConnection, NotSet, Set};
use serde::{Deserialize, Serialize};
use tap::Conv;
use crate::model::problem::{Problem, ProblemStatement};
use crate::model::user::User;
use crate::Result;
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
pub async fn create_problem<T: BasicUserInfo>(db: &DatabaseConnection, owner: &T, problem: &Problem, create_option: CreateOption) -> Result<()> {
    let problem_saved = problem.save().await?;
    let guest_node = default_node!(guest_user_node);
    let default_strategy_node = default_node!(default_strategy_node);
    edge::problem::ActiveModel {
        edge_id: NotSet,
        time_limit: Set(problem.limit.time_limit),
        memory_limit: Set(problem.limit.memory_limit),
        difficulty: Set(problem.difficulty.clone().conv::<i64>()),
        platform: Set(problem.platform.clone()),
        iden: Set(problem.iden.clone()),
        name: Set(problem.name.clone()),
        author_id: Set(owner.get_user_id()?),
    }.save(db).await?;
    ManagePermService::add(owner.get_user_id()?, problem_saved.id, Manage::All, db).await;
    if create_option.is_public {
        ManagePermService::add(guest_node, problem_saved.id, Manage::View, db).await;
    }
    if create_option.is_login {
        ManagePermService::add(default_strategy_node, problem_saved.id, Manage::View, db).await;
    }
    Ok(())
}

pub async fn create_statement(db: &DatabaseConnection, problem: &Saved<Problem>, statement: &ProblemStatement) -> Result<Saved<ProblemStatement>> {
    let statement_saved = statement.save().await?;
    problem.attach_statement(db, &statement_saved).await?;
    Ok(statement_saved)
}