use crate::handler::ResultHandler;
use crate::utils::perm::UserAuthCotext;
use macro_handler::{export, generate_handler, handler, perm, require_login, route};

#[generate_handler(route = "/todo", real_path = "/api/training/todo")]
pub mod handler {
    use rmjac_core::{
        model::{training::{TodoList, TodoListItem}, user::User},
        service::{
            event::get_event_with_id,
            save::{ManageService, Saved},
        },
    };

    use super::*;

    #[perm]
    #[require_login]
    async fn perm(user_context: UserAuthCotext) -> bool {
        let _ = user_context;
        true
    }

    #[handler]
    #[route("/create")]
    #[perm(perm)]
    #[export("todo")]
    async fn post_create(
        db: &sea_orm::DatabaseConnection,
        user_context: UserAuthCotext,
        color: String,
        description: String,
    ) -> ResultHandler<Saved<TodoList>> {
        let user = Saved::<User>::get(user_context.user_id).await?;
        let todo = TodoList { color, description }.create(db, &user).await?;
        Ok(todo)
    }

    #[handler]
    #[route("/list")]
    #[perm(perm)]
    #[export("todos")]
    async fn post_list(
        db: &sea_orm::DatabaseConnection,
        user_context: UserAuthCotext,
    ) -> ResultHandler<Vec<TodoListItem>> {
        let user = Saved::<User>::get(user_context.user_id).await?;
        Ok(user.get_all_todo_items(db).await?)
    }

    #[handler]
    #[route("/update")]
    #[perm(perm)]
    #[export("todo")]
    async fn post_update(
        db: &sea_orm::DatabaseConnection,
        user_context: UserAuthCotext,
        todo_id: i64,
        color: Option<String>,
        description: Option<String>,
    ) -> ResultHandler<Saved<TodoList>> {
        let user = Saved::<User>::get(user_context.user_id).await?;
        user.ensure_todo_owner(db, todo_id).await?;

        let saved = Saved::<TodoList>::get(todo_id).await?;
        let mut next = saved.data.clone();

        if let Some(value) = color {
            next.color = value;
        }
        if let Some(value) = description {
            next.description = value;
        }

        Ok(saved.modify_all(next).await?)
    }

    #[handler]
    #[route("/delete")]
    #[perm(perm)]
    async fn post_delete(
        db: &sea_orm::DatabaseConnection,
        user_context: UserAuthCotext,
        todo_id: i64,
    ) -> ResultHandler<()> {
        let user = Saved::<User>::get(user_context.user_id).await?;
        user.remove_todo(db, todo_id).await?;
        Ok(())
    }

    #[export(problem_id)]
    async fn before_resolve_problem_iden(problem_iden: &str) -> ResultHandler<i64> {
        Ok(get_event_with_id(problem_iden).await?)
    }

    #[handler]
    #[route("/add_problem")]
    #[perm(perm)]
    async fn post_add_problem(
        db: &sea_orm::DatabaseConnection,
        user_context: UserAuthCotext,
        todo_id: i64,
        problem_id: i64,
        problem_iden: String,
        description: Option<String>,
    ) -> ResultHandler<()> {
        let user = Saved::<User>::get(user_context.user_id).await?;
        user.ensure_todo_owner(db, todo_id).await?;

        let todo = Saved::<TodoList>::get(todo_id).await?;
        if todo.has_problem(db, problem_id).await? {
            return Err(rmjac_core::error::CoreError::Conflict(
                "problem already exists in todo list".to_string(),
            )
            .into());
        }

        todo.add_problem(
            db,
            &problem_iden,
            problem_id,
            description.as_deref().unwrap_or_default(),
        )
        .await?;

        Ok(())
    }

    #[handler]
    #[route("/remove_problem")]
    #[perm(perm)]
    async fn post_remove_problem(
        db: &sea_orm::DatabaseConnection,
        user_context: UserAuthCotext,
        todo_id: i64,
        problem_id: i64,
    ) -> ResultHandler<()> {
        let user = Saved::<User>::get(user_context.user_id).await?;
        user.ensure_todo_owner(db, todo_id).await?;

        let todo = Saved::<TodoList>::get(todo_id).await?;
        todo.remove_problem(db, problem_id).await?;

        Ok(())
    }

    #[handler]
    #[route("/reorder")]
    #[perm(perm)]
    async fn post_reorder(
        db: &sea_orm::DatabaseConnection,
        user_context: UserAuthCotext,
        todo_id: i64,
        edge_ids: Vec<i64>,
    ) -> ResultHandler<()> {
        let user = Saved::<User>::get(user_context.user_id).await?;
        user.ensure_todo_owner(db, todo_id).await?;

        Saved::<TodoList>::get(todo_id)
            .await?
            .reorder_problems(db, &edge_ids)
            .await?;

        Ok(())
    }
}
