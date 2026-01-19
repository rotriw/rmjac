use crate::handler::{HandlerError, HttpError, ResultHandler};
use crate::utils::perm::UserAuthCotext;
use macro_handler::{generate_handler, handler, perm, route};
use rmjac_core::graph::node::user::remote_account::{RemoteMode, VjudgeAuth};
use rmjac_core::model::ModelStore;
use rmjac_core::model::vjudge::{AddErrorResult, Platform, VjudgeAccount};
use serde::Deserialize;

#[generate_handler(route = "/bind", real_path = "/api/vjudge/bind")]
pub mod handler {
    use rmjac_core::model::vjudge::BindAccountReq;

    use super::*;

    #[perm]
    async fn check_bind_perm(user_context: Option<UserAuthCotext>) -> bool {
        if let Some(uc) = user_context
            && uc.is_real
        {
            true
        } else {
            false
        }
    }

    #[handler]
    #[perm(check_bind_perm)]
    #[route("/")]
    async fn post_bind(
        store: &mut impl ModelStore,
        user_context: Option<UserAuthCotext>,
        data: BindAccountReq,
    ) -> ResultHandler<serde_json::Value> {
        let user_id = user_context.unwrap().user_id;

        let platform = match data.platform.to_lowercase().as_str() {
            "codeforces" => Platform::Codeforces,
            "atcoder" => Platform::Atcoder,
            _ => {
                return Err(HttpError::HandlerError(HandlerError::InvalidInput(
                    "Invalid platform".to_string(),
                )));
            }
        };
        let remote_mode = match (platform, data.method.to_lowercase().as_str()) {
            (Platform::Codeforces, "password") => RemoteMode::SyncCode,
            (Platform::Codeforces, "token") => RemoteMode::SyncCode,
            (Platform::Codeforces, "apikey") => RemoteMode::OnlySync,
            (Platform::Atcoder, "password") => RemoteMode::SyncCode,
            (Platform::Atcoder, "token") => RemoteMode::SyncCode,
            _ => {
                return Err(HttpError::HandlerError(HandlerError::InvalidInput(
                    "Invalid method for platform".to_string(),
                )));
            }
        };

        let result = VjudgeAccount::create(
            store.get_db(),
            user_id,
            data.iden,
            data.platform.clone(),
            remote_mode,
            data.auth.clone(),
            data.bypass_check.unwrap_or(false),
            data.ws_id.clone(),
        )
        .await;

        match result {
            Ok(node) => Ok(serde_json::json!({
                "code": 0,
                "msg": "Success",
                "data": node
            })),
            Err(AddErrorResult::CoreError(e)) => Err(HttpError::CoreError(e)),
            Err(AddErrorResult::Warning(msg, node)) => Ok(serde_json::json!({
                "code": 1,
                "msg": msg,
                "data": node
            })),
        }
    }
}
