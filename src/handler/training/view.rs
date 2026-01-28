use crate::handler::ResultHandler;
use crate::utils::perm::UserAuthCotext;
use macro_handler::{export, from_path, generate_handler, handler, perm, route};
use rmjac_core::model::ModelStore;
use rmjac_core::model::training::Training;
use rmjac_core::service::perm::provider::{Pages, PagesPermService, System, SystemPermService};
use rmjac_core::service::perm::typed::PermVerify;

#[generate_handler(route = "/view", real_path = "/api/training/view")]
pub mod handler {
    use rmjac_core::model::training::TrainingListStatus;
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
    #[export("data", "user")]
    async fn get_view(
        user_context: Option<UserAuthCotext>,
        store: &mut impl ModelStore,
        node_id: i64,
    ) -> ResultHandler<(Training, Option<TrainingListStatus>)> {
        let training = Training::get(store, node_id).await?;
        let pid = Training::root_id(store, node_id).await?;
        log::info!("{pid}");
        let result = if let Some(user) = &user_context
        && user.is_real {
            Training::status(store, user.user_id, pid).await.ok()
        } else {
            None
        };
        Ok((training, result))
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

    #[handler]
    #[route("/perm_get")]
    #[export("data")]
    async fn post_get_perm(
        store: &mut impl ModelStore,
        node_id: i64,
        user_context: Option<UserAuthCotext>
    ) -> ResultHandler<String> {
        let user = if let Some(uc) = user_context && uc.is_real {
            uc.user_id
        } else {
            default_node!(guest_user_node)
        };

        if PagesPermService::verify(user, node_id, Pages::Delete + Pages::Edit) {
            Ok("Owner".to_string())
        } else if PagesPermService::verify(user, node_id, Pages::Edit) {
            Ok("Editor".to_string())
        } else if PagesPermService::verify(user, node_id, Pages::View) {
            Ok("Viewer".to_string())
        } else {
            Ok("None".to_string())
        }
    }

}
