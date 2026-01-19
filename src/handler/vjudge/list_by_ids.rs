use crate::handler::ResultHandler;
use crate::utils::perm::UserAuthCotext;
use macro_handler::{generate_handler, handler, perm, route};
use rmjac_core::model::ModelStore;
use rmjac_core::model::vjudge::VjudgeAccount;

#[generate_handler(route = "/list", real_path = "/api/vjudge/list")]
pub mod handler {
    use macro_handler::export;
    use rmjac_core::graph::node::user::remote_account::VjudgeNode;

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
    #[route("/list_by_ids")]
    #[export("data")]
    async fn post_list_by_ids(
        store: &mut impl ModelStore,
        user_context: Option<UserAuthCotext>,
        ids: Vec<i64>,
    ) -> ResultHandler<Vec<VjudgeNode>> {
        let uc = user_context.unwrap();
        let is_admin = VjudgeAccount::can_manage(uc.user_id);

        let mut results = vec![];
        for id in &ids {
            let owned = VjudgeAccount::new(*id)
                .owned_by(store.get_db(), uc.user_id)
                .await
                .unwrap_or(false);
            if is_admin || owned {
                if let Ok(node) = VjudgeAccount::get(store.get_db(), *id).await {
                    results.push(node);
                }
            }
        }
        Ok(results)
    }
}
