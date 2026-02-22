use crate::handler::ResultHandler;
use crate::utils::perm::UserAuthCotext;
use macro_handler::{export, generate_handler, handler, perm, require_login, route};
use rmjac_core::service::perm::provider::System;

#[generate_handler(route = "/view", real_path = "/api/event/view")]
pub mod handler {
    use rmjac_core::{action::problem::{CreateOption, create_problem}, error::CoreError, model::{event::{Event, EventParent, EventType}, problem::Problem, user::User}, service::{event::{create_event_total, get_event_with_id}, iden::get, perm::provider::Manage, save::{ManageService, Saved}}};
    use sea_orm::DatabaseConnection;

    use super::*;

    #[perm]
    #[require_login]
    async fn perm(user_context: UserAuthCotext, id: i64) -> bool {
        let user_id = user_context.user_id;
        let system_id = rmjac_core::env::DEFAULT_NODES
            .lock()
            .unwrap()
            .default_system_node;
        Manage::verify(user_id, id, Manage::View) || System::verify(user_id, system_id, System::ViewAllPage)
    }

    #[export(id)]
    async fn before_expand(iden: &str) -> ResultHandler<i64> {
        Ok(get_event_with_id(iden).await?)
    }

    #[handler]
    #[route("/get")]
    #[perm(perm)]
    #[export("event")]
    async fn post_view(
        db: &DatabaseConnection,
        id: i64,
    ) -> ResultHandler<Saved<Event>> {
        Ok(Saved::get(id).await?)
    }
}
