use crate::handler::ResultHandler;
use crate::utils::perm::UserAuthCotext;
use macro_handler::{export, from_path, generate_handler, handler, perm, route};
use rmjac_core::model::ModelStore;
use rmjac_core::model::training::Training;
use rmjac_core::service::perm::provider::{Pages, PagesPermService, System, SystemPermService};
use rmjac_core::service::perm::typed::PermVerify;

#[generate_handler(route = "/view", real_path = "/api/training/view")]
pub mod handler {
    use super::*;

    #[from_path()]
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
    async fn check_view_perm(user_context: Option<UserAuthCotext>, node_id: i64) -> bool {
        if let Some(user) = &user_context
            && user.is_real
        {
            if PagesPermService::verify(user.user_id, node_id, Pages::View) {
                return true;
            }
            if SystemPermService::verify(user.user_id, node_id, System::ManageAllTraining) {
                return true;
            }
        }
        PagesPermService::verify(
            default_node!(guest_user_node),
            node_id,
            Pages::View,
        )
    }

    #[handler]
    #[perm(check_view_perm)]
    #[route("/normal")]
    #[export("data")]
    async fn get_view(
        store: &mut impl ModelStore,
        node_id: i64,
    ) -> ResultHandler<Training> {
        let training = Training::get(store, node_id).await?;
        Ok(training)
    }

    #[handler]
    #[perm(check_view_perm)]
    #[route("/normal")]
    #[export("data")]
    async fn post_view(
        store: &mut impl ModelStore,
        user_iden: &str,
        training_iden: &str,
        node_id: i64,
    ) -> ResultHandler<Training> {
        let training = Training::get(store, node_id).await?;
        Ok(training)
    }
}
