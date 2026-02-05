use crate::handler::ResultHandler;
use crate::utils::perm::UserAuthCotext;
use macro_handler::{export, generate_handler, handler, perm, route};
use rmjac_core::model::ModelStore;
use rmjac_core::model::training_list::TrainingList;
use serde::Serialize;

#[derive(Serialize)]
pub struct TrainingCreateResult {
    pub node_id: i64,
}

#[generate_handler(route = "/list", real_path = "/api/training/list")]
pub mod handler {
    use actix_web::web::method;
    use macro_handler::require_login;
    use rmjac_core::graph::edge::training_user::TrainingUserEdge;
    use rmjac_core::model::training::{CreateTrainingReq, TrainingPerm};
    use rmjac_core::service::perm::provider::{Pages, PagesPermService, System, SystemPermService};
    use super::*;

    #[perm]
    #[require_login]
    async fn require_edit(user_context: UserAuthCotext, tid: i64) -> bool {
        let uid = user_context.user_id;
        if PagesPermService::verify(uid, tid, Pages::Edit) {
            return true;
        }
        if SystemPermService::verify(uid, tid, System::ManageAllTraining) {
            return true;
        }
        false
    }

    #[handler]
    #[require_login]
    #[route("/get/{method}")]
    #[export("data")]
    async fn get_normal(
        store: &mut impl ModelStore,
        user_context: UserAuthCotext,
        method: String,
    ) -> ResultHandler<Vec<TrainingUserEdge>> {
        let user_id = user_context.user_id;
        Ok(TrainingList::get(store, user_id, method.into()).await?)
    }


    #[handler]
    #[require_login]
    #[perm(require_edit)]
    #[route("/invite")]
    #[export("data")]
    async fn post_invite(
        store: &mut impl ModelStore,
        user_context: UserAuthCotext,
        tid: i64,
        uid: i64,
    ) -> ResultHandler<()> {
        let _ = user_context;
        TrainingList::invite(store, tid, uid).await?;
        Ok(())
    }

    #[handler]
    #[require_login]
    #[route("/accept_invite")]
    #[export("data")]
    async fn post_accept_invite(
        store: &mut impl ModelStore,
        user_context: UserAuthCotext,
        tid: i64,
    ) -> ResultHandler<()> {
        let uid = user_context.user_id;
        TrainingList::joined(store, tid, uid).await?;
        Ok(())
    }
}
