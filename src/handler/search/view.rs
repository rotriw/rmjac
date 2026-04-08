use crate::handler::ResultHandler;
use crate::utils::perm::UserAuthCotext;
use macro_handler::{export, generate_handler, handler, perm, require_login, route};
use rmjac_core::service::perm::provider::{System, SystemPermService};

#[generate_handler(route = "/default", real_path = "/api/search/default")]
pub mod handler {
    use rmjac_core::{action::problem::{CreateOption, create_problem}, error::CoreError, model::{event::{Event, EventParent, EventType}, problem::Problem, user::User}, service::{event::{create_event_iden, get_event_with_id}, perm::provider::Manage, save::{ManageService, Saved}}};
    use sea_orm::DatabaseConnection;
    use rmjac_core::db::entity::edge::search::Model;
    use rmjac_core::service::search::{analyze_search, SearchOption};
    use super::*;
    #[handler]
    #[route("/get")]
    #[export("problem")]
    async fn post_search(
        db: &DatabaseConnection,
        iden: &str,
        offset: u64,
        number: u64,
    ) -> ResultHandler<(Vec<Model>, SearchOption)> {
        let data = analyze_search(db, iden, offset, number).await?;
        Ok(data)
    }
}
