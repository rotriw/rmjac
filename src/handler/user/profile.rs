use crate::handler::ResultHandler;
use crate::utils::perm::UserAuthCotext;
use macro_handler::{export, generate_handler, handler, route};

#[generate_handler(route = "/profile", real_path = "/api/user/profile")]
pub mod handler {
    use rmjac_core::{
        model::user::{DisplayUser, User},
        service::{
            save::{ManageService, Saved},
            user::from::FromUserIden,
        },
    };
    use rmjac_core::service::record::query::QueryRecord;
    use sea_orm::DatabaseConnection;

    use super::*;

    #[handler]
    #[route("/get")]
    #[export("user", "accepted_count", "submit_count", "todo_count", "todo_problem_count", "accepted_problems")]
    async fn get_profile(
        db: &DatabaseConnection,
        username: &str,
    ) -> ResultHandler<(Saved<DisplayUser>, i64, i64, i64, i64, Vec<String>)> {
        use rmjac_core::service::record::query::QueryRecord;
        let user = Saved::<User>::from_user_iden(db, username).await?;
        let accepted = user.query_status_submission(db, rmjac_core::model::record::JudgeStatus::Accepted).await?;
        
        let mut accepted_problems = vec![];
        for problem in accepted {
            let iden = problem.data.sign.clone().unwrap_or(format!("ID:{}", problem.id));
            accepted_problems.push(iden);
        }
        
        // Remove duplicates since a user might have multiple accepted submissions for the same problem
        accepted_problems.sort();
        accepted_problems.dedup();

        let accepted_count = accepted_problems.len() as i64;
        let submit_count = user.get_submit_count(db).await?;

        let todos = user.get_all_todo_items(db).await?;
        let todo_count = todos.len() as i64;
        let todo_problem_count = todos
            .iter()
            .map(|todo| todo.problems.len() as i64)
            .sum::<i64>();

        Ok((user.map(), accepted_count, submit_count, todo_count, todo_problem_count, accepted_problems))
    }
}
