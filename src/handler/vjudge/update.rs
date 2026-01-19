use crate::handler::{HandlerError, HttpError, ResultHandler};
use crate::utils::perm::UserAuthCotext;
use macro_handler::{generate_handler, handler, perm, route};
use rmjac_core::graph::node::user::remote_account::VjudgeAuth;
use rmjac_core::model::ModelStore;
use rmjac_core::model::vjudge::VjudgeAccount;
use serde::Deserialize;

#[derive(Deserialize)]
pub struct UpdateAccountReq {
    pub node_id: i64,
    pub auth: Option<VjudgeAuth>,
}

#[generate_handler(route = "/update", real_path = "/api/vjudge/update")]
pub mod handler {
    use macro_handler::export;

    use crate::handler::user::auth;

    use super::*;

    #[perm]
    async fn check_perm(user_context: Option<UserAuthCotext>) -> bool {
        if let Some(uc) = user_context
            && uc.is_real
        {
            true
        } else {
            false
        }
    }

    #[handler]
    #[perm(check_perm)]
    #[route("/account")]
    #[export("message")]
    async fn put_update(
        store: &mut impl ModelStore,
        user_context: Option<UserAuthCotext>,
        node_id: i64,
        auth: Option<VjudgeAuth>,
    ) -> ResultHandler<String> {
        let uc = user_context.unwrap();

        // Manual permission check
        if !VjudgeAccount::can_manage(uc.user_id)
            && !VjudgeAccount::new(node_id)
                .owned_by(store.get_db(), uc.user_id)
                .await
                .unwrap_or(false)
        {
            return Err(HttpError::HandlerError(HandlerError::PermissionDenied));
        }

        VjudgeAccount::new(node_id)
            .set_auth(store.get_db(), auth)
            .await?;
        Ok("success".to_string())
    }
}
