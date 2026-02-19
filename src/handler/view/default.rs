use crate::handler::{HandlerError, HttpError, ResultHandler};
use crate::utils::perm::UserAuthCotext;
use macro_handler::{export, from_path, generate_handler, handler, perm, route};
use rmjac_core::error::CoreError;
#[generate_handler(route = "/default", real_path = "/api/view/default")]
pub mod handler {
    use sea_orm::sea_query::ExprTrait;
    use rmjac_core::service::iden::{get, only_get_id};
    use rmjac_core::service::perm::provider::Manage;
    use rmjac_core::service::perm::provider::ManagePermService;
    use super::*;

    #[export(s_node_id)]
    async fn before_resolve(iden: &str) -> ResultHandler<i64> {
        let v = only_get_id(iden).await;
        if v.is_none() {
            Err(CoreError::NotFound("not found iden.".to_string()))?;
        }
        Ok(v.unwrap())
    }

    #[perm]
    async fn perm(user_context: Option<UserAuthCotext>, node_id: i64) -> bool {
        if let Some(uc) = user_context
            && uc.is_real
        {
            ManagePermService::verify(uc.user_id, node_id, Manage::View)
        } else {
            false
        }
    }

    #[handler]
    #[perm(perm)]
    #[route("/with_iden")]
    #[export("data")]
    async fn get_with_iden(
        user_context: Option<UserAuthCotext>,
        iden: String,
    ) -> ResultHandler<Page> {

    }

    #[handler]
    #[perm(check_login)]
    #[route("/with_id")]
    #[export("data")]
    async fn get_with_node_id(
        user_context: Option<UserAuthCotext>,
        node_id: i64,
    ) -> ResultHandler<Page> {

    }

    #[handler]
    #[perm(check_login)]
    #[route("/delete/{node_id}")]
    #[export("message")]
    async fn post_delete_account(
        user_context: Option<UserAuthCotext>,
        account_node_id: i64,
    ) -> ResultHandler<String> {

    }
}
