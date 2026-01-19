use crate::handler::ResultHandler;
use crate::utils::perm::UserAuthCotext;
use macro_handler::{export, generate_handler, handler, perm, require_login, route};
use rmjac_core::graph::node::record::RecordStatus;
use rmjac_core::model::ModelStore;
use rmjac_core::model::problem::ProblemRepository;
use rmjac_core::model::record::RecordRepository;

#[generate_handler(route = "/status", real_path = "/api/record/status")]
pub mod handler {
    use super::*;

    #[perm]
    #[require_login]
    async fn check_status_perm(user_context: UserAuthCotext) -> bool {
        let _user_id = user_context.user_id;
        true
    }

    #[handler]
    #[perm(check_status_perm)]
    #[route("/{problem_iden}")]
    #[export("user_id", "problem_id", "status")]
    async fn get_status(
        store: &mut impl ModelStore,
        user_context: UserAuthCotext,
        problem_iden: String,
    ) -> ResultHandler<(i64, i64, RecordStatus)> {
        let user_id = user_context.user_id;
        let (problem_node_id, _) = ProblemRepository::resolve(store, &problem_iden).await?;
        let status =
            RecordRepository::user_status(store.get_db(), user_id, problem_node_id).await?;
        Ok((user_id, problem_node_id, status))
    }
}
