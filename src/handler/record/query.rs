use crate::handler::ResultHandler;
use crate::utils::perm::UserAuthCotext;
use macro_handler::{export, generate_handler, handler, perm, require_login, route};
use rmjac_core::service::perm::provider::System;

#[generate_handler(route = "/query", real_path = "/api/record/query")]
pub mod handler {
    use rmjac_core::{
        action::problem::{CreateOption, create_problem},
        error::CoreError,
        model::{
            event::{Event, EventIden, EventParent, EventType},
            problem::Problem,
            record::{DetailSubtask, Record},
            user::User,
        },
        service::{
            event::{create_event_iden, get_event_with_id},
            judge::calc::CalcScore,
            perm::provider::Manage,
            record::{
                query::{QueryResult, query_global},
                subtask::GetSubtask,
            },
            save::{ManageService, Saved},
        },
    };
    use sea_orm::DatabaseConnection;

    use super::*;

    #[perm]
    #[require_login]
    async fn perm(user_context: UserAuthCotext) -> bool {
        true
    }

    #[handler]
    #[route("/get")]
    #[perm(perm)]
    #[export("records")]
    async fn post_query_user_submission(
        db: &DatabaseConnection,
        code_length: Option<i64>,
        user_id: Option<i64>,
        problem_iden: Option<String>,
        offset: u64,
        show_number: u64,
    ) -> ResultHandler<Vec<QueryResult>> {
        Ok(query_global(db, problem_iden.as_deref(), user_id, offset, show_number).await?)
    }
}
