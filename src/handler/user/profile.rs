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
    use sea_orm::DatabaseConnection;

    use super::*;

    #[handler]
    #[route("/get")]
    #[export("user", "accepted_count", "submit_count", "todo_count", "todo_problem_count")]
    async fn get_profile(
        db: &DatabaseConnection,
        username: &str,
    ) -> ResultHandler<(Saved<DisplayUser>, i64, i64, i64, i64)> {
        let user = Saved::<User>::from_user_iden(db, username).await?;
        let accepted_count = user.get_accepted_problem_count(db).await?;
        let submit_count = user.get_submit_count(db).await?;

        let todos = user.get_all_todo_items(db).await?;
        let todo_count = todos.len() as i64;
        let todo_problem_count = todos
            .iter()
            .map(|todo| todo.problems.len() as i64)
            .sum::<i64>();

        Ok((user.map(), accepted_count, submit_count, todo_count, todo_problem_count))
    }
}
