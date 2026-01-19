use crate::handler::{HandlerError, HttpError, ResultHandler};
use crate::utils::perm::UserAuthCotext;
use macro_handler::{generate_handler, handler, perm, route};
use rmjac_core::error::CoreError;
use rmjac_core::graph::node::Node;
use rmjac_core::graph::node::vjudge_task::VjudgeTaskNode;
use rmjac_core::model::ModelStore;
use rmjac_core::model::vjudge::VjudgeAccount;
use serde::Deserialize;


#[generate_handler(route = "/assign_task", real_path = "/api/vjudge/assign_task")]
pub mod handler {
    use rmjac_core::model::vjudge::AssignTaskReq;

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
    #[route("/")]
    async fn post_assign(
        store: &mut impl ModelStore,
        user_context: Option<UserAuthCotext>,
        data: AssignTaskReq,
    ) -> ResultHandler<serde_json::Value> {
        let uc = user_context.unwrap();

        if !VjudgeAccount::can_manage(uc.user_id)
            && !VjudgeAccount::new(data.vjudge_node_id)
                .owned_by(store.get_db(), uc.user_id)
                .await
                .unwrap_or(false)
        {
            return Err(HttpError::HandlerError(HandlerError::PermissionDenied));
        }

        let node = VjudgeAccount::get(store.get_db(), data.vjudge_node_id).await?;
        if !node.public.verified {
            return Err(HttpError::CoreError(CoreError::VjudgeError(
                "Account not verified".to_string(),
            )));
        }

        let task = VjudgeAccount::new(data.vjudge_node_id)
            .add_task(
                store.get_db(),
                uc.user_id,
                data.range.clone(),
                data.ws_id.clone(),
            )
            .await?;

        let task_node = VjudgeTaskNode::from_db(store.get_db(), task.node_id).await?;

        Ok(serde_json::json!({
            "code": 0,
            "msg": "Task assigned",
            "data": task_node
        }))
    }
}
