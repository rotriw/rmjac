use crate::handler::ResultHandler;
use crate::utils::perm::UserAuthCotext;
use macro_handler::{from_path, generate_handler, handler, perm, route};
use rmjac_core::graph::edge::Edge;
use rmjac_core::graph::edge::training_problem::TrainingProblemEdge;
use rmjac_core::model::ModelStore;
use rmjac_core::model::training::{Training, TrainingList};
use rmjac_core::service::perm::provider::{Pages, PagesPermService, System, SystemPermService};

#[generate_handler(route = "/manage", real_path = "/api/training/manage")]
pub mod handler {
    use macro_handler::{export, require_login};
    use rmjac_core::{error::CoreError, graph::node::training::problem::TrainingProblemNode, model::training::TrainingRepo};
    use rmjac_core::model::training::{PermOwner, TrainingPerm};
    use super::*;

    #[from_path()]
    #[export(tid)]
    async fn before_resolve(
        store: &mut impl ModelStore,
        user_iden: &str,
        training_iden: &str,
    ) -> ResultHandler<i64> {
        let node_id = Training::node_id(store, user_iden, training_iden).await?;
        Ok(node_id)
    }

    #[export(prid)]
    async fn before_get_problem_root_id(
        store: &mut impl ModelStore,
        tid: i64
    ) -> ResultHandler<i64> {
        Ok(Training::root_id(store, tid).await?)
    }


    #[export(is_listed)]
    async fn before_check_listed(
        store: &mut impl ModelStore,
        prid: i64,
        lid: i64,
    ) -> ResultHandler<bool> {
        Ok(Training::has_list(store, prid, lid).await?)
    }

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

    #[perm]
    #[require_login]
    async fn require_sudo(user_context: UserAuthCotext, tid: i64) -> bool {
        let uid = user_context.user_id;
        if PagesPermService::verify(uid, tid, Pages::Delete) {
            return true;
        }
        if SystemPermService::verify(uid, tid, System::ManageAllTraining) {
            return true;
        }
        false
    }

    #[handler]
    #[perm(require_edit)]
    #[route("/add_problem_for_list")]
    #[export("failed_count", "failed", "successful_data")]
    async fn post_add_problem_for_list(
        store: &mut impl ModelStore,
        problems: Vec<String>,
        tid: i64,
        lid: i64,
        is_listed: bool,
    ) -> ResultHandler<(usize, Vec<String>, Vec<(i64, i64)>)> {
        if !is_listed {
            Err(CoreError::Guard(format!("Training {tid} not owned {lid}!")))?;
        }
        let mut done_result = vec![];
        let mut failed = vec![];
        for p in &problems {
            let feedback = Training::add_by_iden(store, lid, p).await;
            if feedback.is_err() {
                failed.push(p.clone());
            }
            done_result = feedback.unwrap();
        }
        Ok((failed.len(), failed, done_result))
    }

    #[handler]
    #[perm(require_edit)]
    #[route("/add_problem_list")]
    #[export("new")]
    async fn post_add_problem_list(
        store: &mut impl ModelStore,
        lid: i64,
        problem_list: TrainingList,
        is_listed: bool,
    ) -> ResultHandler<TrainingProblemNode> {
        if !is_listed {
            Err(CoreError::Guard(format!("You select training not owned {lid}!")))?;
        }
        let node = Training::build_list(store, &problem_list, lid).await?;
        Ok(node)
    }

    #[handler]
    #[perm(require_edit)]
    #[route("/modify_description")]
    #[export("message")]
    async fn post_modify_desc(
        store: &mut impl ModelStore,
        lid: i64,
        public: &str,
        private: &str, // login to view.
        is_listed: bool,
    ) -> ResultHandler<String> {
        if !is_listed {
            Err(CoreError::Guard(format!("You select training not owned {lid}!")))?;
        }
        Training::set_desc(
            store,
            lid,
            public,
            private,
        )
        .await?;
        Ok("success".to_string())
    }

    #[handler]
    #[perm(require_sudo)]
    #[route("/remove_problem")]
    #[export("message")]
    async fn post_remove_problem(
        store: &mut impl ModelStore,
        lid: i64,
        edge_id: i64,
        is_listed: bool,
    ) -> ResultHandler<String> {
        let edge = TrainingProblemEdge::from_db(store.get_db(), edge_id).await?;
        if edge.u != lid {
            Err(CoreError::Guard(format!(
                "Problem edge {edge_id} not in list {lid}!"
            )))?;
        }
        if !is_listed {
            Err(CoreError::Guard(format!("You select training not owned {lid}!")))?;
        }
        TrainingRepo::rm_problem(store, edge_id).await?;
        Ok("success".to_string())
    }

    #[handler]
    #[perm(require_edit)]
    #[route("/update_order")]
    #[export("message")]
    async fn post_update_order(
        store: &mut impl ModelStore,
        lid: i64,
        orders: Vec<(i64, i64)>,
        is_listed: bool
    ) -> ResultHandler<String> {
        if !is_listed {
            Err(CoreError::Guard(format!("You select training not owned {lid}!")))?;
        }
        Training::set_order(store, lid, orders).await?;
        Ok("success".to_string())
    }

    #[handler]
    #[perm(require_edit)]
    #[route("/get_viewer")]
    #[export("viewer")]
    async fn post_get_viewers(
        store: &mut impl ModelStore,
        tid: i64,
    ) -> ResultHandler<Vec<PermOwner>> {
        let viewers = TrainingPerm::get(store, Pages::View.into(), tid).await?;
        Ok(viewers)
    }

    #[handler]
    #[perm(require_sudo)]
    #[route("/get_editor")]
    #[export("editor")]
    async fn post_get_editor(
        store: &mut impl ModelStore,
        tid: i64,
    ) -> ResultHandler<Vec<PermOwner>> {
        let editors = TrainingPerm::get(store, Pages::Edit.into(), tid).await?;
        Ok(editors)
    }

    #[handler]
    #[perm(require_sudo)]
    #[route("/get_owner")]
    #[export("owner")]
    async fn post_get_owners(
        store: &mut impl ModelStore,
        tid: i64,
        user_iden: &str,
    ) -> ResultHandler<Vec<PermOwner>> {
        let owner = TrainingPerm::get(store, Pages::Edit + Pages::Delete, tid).await?;
        Ok(owner)
    }

    #[handler]
    #[perm(require_sudo)]
    #[route("/add_owner")]
    #[export("message")]
    async fn post_add_owner(
        store: &mut impl ModelStore,
        tid: i64,
        user_id: i64,
    ) -> ResultHandler<String> {
        TrainingPerm::set(store, Pages::Edit + Pages::Delete, user_id, tid).await?;
        Ok("successful".to_string())
    }

    #[handler]
    #[perm(require_sudo)]
    #[route("/add_editor")]
    #[export("message")]
    async fn post_add_editor(
        store: &mut impl ModelStore,
        tid: i64,
        user_id: i64,
    ) -> ResultHandler<String> {
        TrainingPerm::set(store, (Pages::Edit).into(), user_id, tid).await?;
        Ok("successful".to_string())
    }

    #[handler]
    #[perm(require_edit)]
    #[route("/add_viewer")]
    #[export("message")]
    async fn post_add_viewer(
        store: &mut impl ModelStore,
        tid: i64,
        user_id: i64,
    ) -> ResultHandler<String> {
        TrainingPerm::set(store, (Pages::View).into(), user_id, tid).await?;
        Ok("successful".to_string())
    }


    #[handler]
    #[perm(require_sudo)]
    #[route("/remove_owner")]
    #[export("message")]
    async fn post_remove_owner(
        store: &mut impl ModelStore,
        tid: i64,
        user_id: i64,
    ) -> ResultHandler<String> {
        TrainingPerm::del(store, Pages::Edit + Pages::Delete, user_id, tid).await?;
        Ok("successful".to_string())
    }

    #[handler]
    #[perm(require_sudo)]
    #[route("/remove_editor")]
    #[export("message")]
    async fn post_remove_editor(
        store: &mut impl ModelStore,
        tid: i64,
        user_id: i64,
    ) -> ResultHandler<String> {
        TrainingPerm::del(store, Pages::Edit.into(), user_id, tid).await?;
        Ok("successful".to_string())
    }

    #[handler]
    #[perm(require_edit)]
    #[route("/remove_viewer")]
    async fn post_remove_viewer(
        store: &mut impl ModelStore,
        tid: i64,
        user_id: i64,
    ) -> ResultHandler<String> {
        TrainingPerm::del(store, Pages::View.into(), user_id, tid).await?;
        Ok("successful".to_string())
    }

}
