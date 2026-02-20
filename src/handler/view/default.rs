use crate::handler::{HandlerError, HttpError, ResultHandler};
use crate::utils::perm::UserAuthCotext;
use macro_handler::{export, from_path, generate_handler, handler, perm, route};
use rmjac_core::error::CoreError;
use rmjac_core::pages::Page;
use rmjac_core::service::iden::{get, only_get_id};
use rmjac_core::service::perm::provider::Manage;
use rmjac_core::service::perm::provider::ManagePermService;
use sea_orm::DatabaseConnection;

#[generate_handler(route = "/default", real_path = "/api/view/default")]
pub mod handler {
    use rmjac_core::pages::render_page;
    use super::*;

    #[export(s_node_id)]
    async fn before_resolve(iden: &str) -> ResultHandler<i64> {
        let v = only_get_id(iden).await;
        if v.is_none() {
            Err(CoreError::NotFound("not found iden.".to_string()))?;
        }
        Ok(v.unwrap())
    }

    #[handler]
    #[route("/with_iden")]
    #[export("data")]
    async fn get_with_iden(
        db: &DatabaseConnection,
        user_context: Option<UserAuthCotext>,
        s_node_id: i64,
        view_page: String,
    ) -> ResultHandler<Page> {
        let user_id = if let Some(uc) = user_context && uc.is_real {
            Some(uc.user_id)
        } else {
            None
        };
        Ok(render_page(db, &view_page, s_node_id, user_id).await?)
    }

    #[handler]
    #[route("/with_id")]
    #[export("data")]
    async fn get_with_node_id(
        db: &DatabaseConnection,
        user_context: Option<UserAuthCotext>,
        node_id: i64,
        view_page: String,
    ) -> ResultHandler<Page> {
        let user_id = if let Some(uc) = user_context && uc.is_real {
            Some(uc.user_id)
        } else {
            None
        };
        Ok(render_page(db, &view_page, node_id, user_id).await?)
    }
}
