use crate::handler::{HandlerError, HttpError, ResultHandler};
use crate::utils::perm::UserAuthCotext;
use macro_handler::{export, from_path, generate_handler, handler, perm, route};
use rmjac_core::error::CoreError;
use rmjac_core::model::ModelStore;
use rmjac_core::model::vjudge::{VjudgeAccount, VjudgeTask};

#[generate_handler(route = "/tasks", real_path = "/api/vjudge/tasks")]
pub mod handler {
    use rmjac_core::graph::node::vjudge_task::VjudgeTaskNode;

    use super::*;

    #[from_path(node_id)]
    #[export(vjudge_node_id)]
    async fn before_resolve(node_id: &str) -> ResultHandler<i64> {
        let vjudge_node_id = node_id.parse::<i64>().map_err(|e| {
            HttpError::CoreError(CoreError::StringError(format!("Invalid node_id: {}", e)))
        })?;
        Ok(vjudge_node_id)
    }

    #[perm]
    async fn check_login(user_context: Option<UserAuthCotext>) -> bool {
        if let Some(uc) = user_context
            && uc.is_real
        {
            true
        } else {
            false
        }
    }

    #[handler]
    #[perm(check_login)]
    #[route("/{node_id}")]
    #[export("data")]
    async fn get_tasks(
        store: &mut impl ModelStore,
        user_context: Option<UserAuthCotext>,
        vjudge_node_id: i64,
    ) -> ResultHandler<Vec<VjudgeTaskNode>> {
        let uc = user_context.unwrap();
        // Permission check
        if !VjudgeAccount::can_manage(uc.user_id)
            && !VjudgeAccount::new(vjudge_node_id)
                .owned_by(store.get_db(), uc.user_id)
                .await
                .unwrap_or(false)
        {
            return Err(HttpError::HandlerError(HandlerError::PermissionDenied));
        }

        let tasks = VjudgeTask::list(store.get_db(), vjudge_node_id).await?;
        Ok(tasks)
    }
}
