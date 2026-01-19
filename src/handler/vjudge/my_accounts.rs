use crate::handler::ResultHandler;
use crate::utils::perm::UserAuthCotext;
use macro_handler::{generate_handler, handler, perm, route};
use rmjac_core::model::ModelStore;
use rmjac_core::model::vjudge::VjudgeAccount;

#[generate_handler(route = "/my_accounts", real_path = "/api/vjudge/my_accounts")]
pub mod handler {
    use macro_handler::{export, require_login};
    use rmjac_core::graph::node::user::remote_account::VjudgeNode;

    use super::*;

    #[perm]
    #[require_login]
    async fn check_perm() -> bool {
        true
    }

    #[handler]
    #[perm(check_perm)]
    #[route("/")]
    #[export("data")]
    async fn get_my_accounts(
        store: &mut impl ModelStore,
        user_context: Option<UserAuthCotext>,
    ) -> ResultHandler<Vec<VjudgeNode>> {
        let user_id = user_context.unwrap().user_id;
        let accounts = VjudgeAccount::list(store.get_db(), user_id).await?;
        Ok(accounts)
    }
}
