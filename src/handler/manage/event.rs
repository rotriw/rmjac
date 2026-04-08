use crate::handler::ResultHandler;
use crate::utils::perm::UserAuthCotext;
use macro_handler::{export, generate_handler, handler, perm, require_login, route};
use rmjac_core::service::perm::provider::System;

#[generate_handler(route = "/init", real_path = "/api/manage/init")]
pub mod handler {
    use rmjac_core::{action::{problem::{CreateOption, create_problem}, remotejudge::{update_remotejudge_event, update_remotejudge_problem_all}}, error::CoreError, model::{event::{Event, EventParent, EventType}, problem::Problem, user::User}, service::{edge::get_contests, event::{create_event_iden, get_event_with_id}, perm::provider::Manage, save::{ManageService, Saved}}};
    use sea_orm::DatabaseConnection;

    use super::*;

    #[perm]
    #[require_login]
    async fn init_action(user_context: UserAuthCotext) -> bool {
        let user_id = user_context.user_id;
        let system_id = rmjac_core::env::DEFAULT_NODES
            .lock()
            .unwrap()
            .default_system_node;
        System::verify(user_id, system_id, System::ManageInit)
    }

    #[handler]
    #[route("/update_remotejudge_event")]
    #[perm(init_action)]
    #[export("message")]
    async fn post_update_remotejudge_event(
        db: &DatabaseConnection,
        platform: &str,
    ) -> ResultHandler<String> {
        update_remotejudge_event(platform, db).await?;
        Ok("Initialization successful".to_string())
    }

    #[handler]
    #[route("/update_platform_event")]
    #[perm(init_action)]
    #[export("message")]
    async fn post_update_problem(
        db: &DatabaseConnection,
        platform: &str,
        timeout: Option<u64>,
    ) -> ResultHandler<String> {
        let ndb = db.clone();
        let platform = platform.to_string();
        tokio::spawn(async move {
            update_remotejudge_problem_all(&platform, timeout.unwrap_or(1000), &ndb).await
        });
        Ok("task add successful.".to_string())
    }
}
