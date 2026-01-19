use crate::handler::{HttpError, ResultHandler};
use crate::utils::perm::UserAuthCotext;
use macro_handler::{export, from_path, generate_handler, handler, perm, require_login, route};
use rmjac_core::graph::node::record::{RecordNode, RecordStatus};
use rmjac_core::model::ModelStore;
use rmjac_core::model::record::Record;

#[generate_handler(route = "/manage", real_path = "/api/record/manage")]
pub mod handler {
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
    async fn check_manage_perm() -> bool {
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
}
