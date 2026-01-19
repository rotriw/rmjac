use crate::handler::{HandlerError, HttpError, ResultHandler};
use crate::utils::perm::UserAuthCotext;
use macro_handler::{generate_handler, handler, perm, route};
use rmjac_core::model::ModelStore;
use rmjac_core::model::submit::SubmissionService;
use rmjac_core::model::vjudge::VjudgeAccount;
use rmjac_core::service::judge::service::{CompileOptionValue, StringOption, SubmitContext};
use serde::Deserialize;
use std::collections::HashMap;

#[derive(Deserialize)]
pub struct SubmitReq {
    pub statement_id: i64,
    pub vjudge_id: i64,
    pub code: String,
    pub language: String,
    pub judge_option: HashMap<String, String>,
    pub public_view: bool,
}

#[generate_handler(route = "/vjudge", real_path = "/api/submit/vjudge")]
pub mod handler {
    use macro_handler::export;
    use rmjac_core::graph::node::record::RecordNode;

    use super::*;

    #[perm]
    async fn check_submit_perm(user_context: Option<UserAuthCotext>) -> bool {
        if let Some(uc) = user_context
            && uc.is_real
        {
            true
        } else {
            false
        }
    }

    #[handler]
    #[perm(check_submit_perm)]
    #[route("/")]
    #[export("message", "record")]
    async fn post_submit(
        store: &mut impl ModelStore,
        user_context: Option<UserAuthCotext>,
        stmt_id: i64,
        vjudge_id: i64,
        code: String,
        language: String,
        judge_option: HashMap<String, String>,
        public_view: bool,
    ) -> ResultHandler<(String, RecordNode)> {
        let uc = user_context.unwrap();

        if !VjudgeAccount::new(vjudge_id)
            .owned_by(store.get_db(), uc.user_id)
            .await
            .unwrap_or(false)
        {
            return Err(HttpError::HandlerError(HandlerError::PermissionDenied));
        }

        let mut judge_option_n: HashMap<String, Box<dyn CompileOptionValue>> = HashMap::new();
        for (k, v) in judge_option {
            judge_option_n.insert(k, Box::new(StringOption { value: v }));
        }

        let context = SubmitContext {
            code: code.clone(),
        };

        let record = SubmissionService::submit(
            store,
            stmt_id,
            uc.user_id,
            vjudge_id,
            &code,
            &language,
            judge_option_n,
            context,
            public_view,
        )
        .await
        .map_err(HttpError::CoreError)?;

        Ok(("success".to_string(), record))
    }
}
