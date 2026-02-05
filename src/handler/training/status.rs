use crate::handler::ResultHandler;
use crate::utils::perm::UserAuthCotext;
use macro_handler::{export, generate_handler, handler, perm, route};
use rmjac_core::model::ModelStore;
use rmjac_core::model::training::Training;
use rmjac_core::service::perm::provider::{Pages, PagesPermService, System, SystemPermService};

#[generate_handler(route = "/status", real_path = "/api/training/status")]
pub mod handler {
    use macro_handler::require_login;
    use rmjac_core::model::training::TrainingListStatus;

    use super::*;

    #[export(node_id)]
    async fn before_resolve(
        store: &mut impl ModelStore,
        user_iden: &str,
        training_iden: &str,
    ) -> ResultHandler<i64> {
        let node_id = Training::node_id(store, user_iden, training_iden).await?;
        Ok(node_id)
    }

    #[perm]
    #[require_login]
    async fn check_status_perm(user_context: UserAuthCotext, node_id: i64) -> bool {
        let uid = user_context.user_id;
        if PagesPermService::verify(uid, node_id, Pages::View) {
            return true;
        }
        SystemPermService::verify(uid, node_id, System::ManageAllTraining)
    }

    #[handler]
    #[perm(check_status_perm)]
    #[route("/get")]
    #[export("message", "data")]
    async fn get_status(
        store: &mut impl ModelStore,
        user_context: UserAuthCotext,
        node_id: i64,
    ) -> ResultHandler<(String, TrainingListStatus)> {
        let user_id = user_context.user_id;
        let accept_status = Training::status(store, user_id, node_id).await?;
        Ok((
            "successful".to_string(),
            accept_status,
        ))
    }
}
