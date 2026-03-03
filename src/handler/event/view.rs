use crate::handler::ResultHandler;
use crate::utils::perm::UserAuthCotext;
use macro_handler::{export, generate_handler, handler, perm, require_login, route};
use rmjac_core::service::perm::provider::System;

#[generate_handler(route = "/view", real_path = "/api/event/view")]
pub mod handler {
    use rmjac_core::{
        action::{
            problem::{CreateOption, create_problem},
            remotejudge::update_remotejudge_problem,
        },
        env::DEFAULT_NODES,
        error::CoreError,
        model::{
            event::{Event, EventParent, EventType},
            problem::Problem,
            user::User,
        },
        service::{
            event::{create_event_iden, get_event_with_id},
            perm::provider::Manage,
            save::{ManageService, Saved},
        },
    };
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
        Manage::verify(user_id, id, Manage::View)
            || System::verify(user_id, system_id, System::ViewAllPage)
    }

    #[export(id)]
    async fn before_expand(iden: &str) -> ResultHandler<i64> {
        Ok(get_event_with_id(iden).await?)
    }

    #[handler]
    #[route("/get")]
    #[perm(perm)]
    #[export("event")]
    async fn post_view(db: &DatabaseConnection, id: i64) -> ResultHandler<Saved<Event>> {
        Ok(Saved::get(id).await?)
    }

    #[handler]
    #[route("/problems")]
    #[perm(perm)]
    #[export("event")]
    async fn post_view_problems(
        db: &DatabaseConnection,
        id: i64,
    ) -> ResultHandler<Vec<(Saved<Problem>, String)>> {
        let event = Saved::<Event>::get(id).await?;
        Ok(event.get_problems(db).await?)
    }

    #[perm]
    async fn update_perm(user_context: UserAuthCotext) -> bool {
        let system_id = DEFAULT_NODES.lock().unwrap().default_system_node;
        System::verify(user_context.user_id, system_id, System::UpdateEvent)
    }

    #[handler]
    #[route("/update_problems")]
    #[perm(update_perm)]
    #[export("message")]
    #[require_login]
    async fn post_update_problems(
        id: i64,
        platform: &str,
        db: &DatabaseConnection,
    ) -> ResultHandler<String> {
        let event = Saved::get(id).await?;
        update_remotejudge_problem(platform, &event, db).await?;
        Ok("successful".to_string())
    }
}
