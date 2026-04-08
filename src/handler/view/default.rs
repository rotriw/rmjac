use crate::handler::{HandlerError, HttpError, ResultHandler};
use crate::utils::perm::UserAuthCotext;
use macro_handler::{export, from_path, generate_handler, handler, perm, route};
use rmjac_core::error::CoreError;
use rmjac_core::pages::{Sidebar, get_sidebar as core_get_sidebar};
use rmjac_core::service::save::ManageService;
use rmjac_core::service::perm::provider::Manage;
use rmjac_core::service::perm::provider::ManagePermService;
use sea_orm::DatabaseConnection;

#[generate_handler(route = "/default", real_path = "/api/view/default")]
pub mod handler {
    use rmjac_core::service::event::get_event_with_id;
    use rmjac_core::service::save::Saved;
    use super::*;

    #[export(s_node_id)]
    async fn before_resolve(iden: &str) -> ResultHandler<i64> {
        let v = get_event_with_id(iden).await?;
        Ok(v)
    }

    #[handler]
    #[route("/sidebar")]
    #[export("data")]
    async fn post_sidebar(
        db: &DatabaseConnection,
        user_context: Option<UserAuthCotext>,
        path: &str,
    ) -> ResultHandler<Vec<Sidebar>> {
        let user_id = if let Some(uc) = user_context && uc.is_real {
            Some(Saved::get(uc.user_id).await?)
        } else {
            None
        };
        Ok(core_get_sidebar(user_id, path))
    }
}
