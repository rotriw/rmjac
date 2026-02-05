use crate::handler::{HttpError, ResultHandler};
use crate::utils::perm::UserAuthCotext;
use macro_handler::{export, from_path, generate_handler, handler, perm, require_login, route};
use rmjac_core::graph::node::record::{RecordNode, RecordStatus};
use rmjac_core::model::ModelStore;
use rmjac_core::graph::node::Node;
use rmjac_core::model::record::Record;

#[generate_handler(route = "/manage", real_path = "/api/record/manage")]
pub mod handler {
    use rmjac_core::graph::node::user::remote_account::VjudgeNode;
    use rmjac_core::model::vjudge::VjudgeService;
    use rmjac_core::error::CoreError;
    use rmjac_core::service::perm::provider::{Pages, PagesPermService};
    use super::*;

    #[from_path(record_id)]
    #[export(record_node_id)]
    async fn before_resolve(record_id: &str) -> ResultHandler<i64> {
        record_id.parse::<i64>().map_err(|e| {
            HttpError::CoreError(rmjac_core::error::CoreError::StringError(format!(
                "Invalid record_id: {}",
                e
            )))
        })
    }

    #[perm]
    #[require_login]
    async fn check_manage_perm(user_context: UserAuthCotext, record_node_id: i64) -> bool {
        let uid = user_context.user_id;
        let _res = PagesPermService::verify(uid, record_node_id, Pages::Edit);
        true
    }

    #[perm]
    #[require_login]
    async fn check_refresh_perm(user_context: UserAuthCotext, record_node_id: i64, vjudge_id: i64) -> bool {
        let uid = user_context.user_id;
        let _res = PagesPermService::verify(uid, record_node_id, Pages::Edit);
        true
    }

    #[handler]
    #[perm(check_manage_perm)]
    #[route("/{record_id}/status")]
    #[export("message", "record")]
    async fn post_update_status(
        store: &mut impl ModelStore,
        record_node_id: i64,
        status: i64,
    ) -> ResultHandler<(String, RecordNode)> {
        let record_status: RecordStatus = status.into();
        let updated_record = Record::new(record_node_id)
            .set_status(store.get_db(), record_status)
            .await?;
        Ok((
            "Record status updated successfully".to_string(),
            updated_record,
        ))
    }

    #[handler]
    #[perm(check_manage_perm)]
    #[route("/{record_id}/delete")]
    #[export("message", "record")]
    async fn post_delete(
        store: &mut impl ModelStore,
        record_node_id: i64,
    ) -> ResultHandler<(String, RecordNode)> {
        let deleted_record = Record::new(record_node_id).delete(store.get_db()).await?;
        Ok(("Record deleted successfully".to_string(), deleted_record))
    }

    #[handler]
    #[perm(check_refresh_perm)]
    #[route("/{record_id}/refresh")]
    #[export("message")]
    async fn post_refresh(
        store: &mut impl ModelStore,
        record_node_id: i64,
        vjudge_id: i64,
    ) -> ResultHandler<String> {
        let record = RecordNode::from_db(store.get_db(), record_node_id).await?;
        let vjudge_node = VjudgeNode::from_db(store.get_db(), vjudge_id).await?;
        let url = record.public.record_url;
        if url.is_none() {
            return Err(HttpError::CoreError(CoreError::StringError(
                "Record URL is empty, cannot refresh".to_string(),
            )));
        }
        let url = url.unwrap();
        VjudgeService::refresh_one(record.node_id, &record.public.record_platform, &vjudge_node, &url).await?;
        Ok("success".to_string())
    }
}
