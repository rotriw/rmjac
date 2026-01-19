use crate::handler::{HttpError, ResultHandler};
use crate::utils::perm::UserAuthCotext;
use macro_handler::{export, from_path, generate_handler, handler, route};
use rmjac_core::graph::node::Node;
use rmjac_core::graph::node::record::RecordNode;
use rmjac_core::model::record::{Record, SubtaskUserRecord};
// 使用 record 模块自己的 ModelStore trait
use rmjac_core::model::record::ModelStore;

#[generate_handler(route = "/view", real_path = "/api/record/view")]
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

    #[handler]
    #[route("/{record_id}")]
    #[export("record", "judge_data")]
    async fn get_view(
        store: &mut impl ModelStore,
        record_node_id: i64,
    ) -> ResultHandler<(RecordNode, SubtaskUserRecord)> {
        let record = RecordNode::from_db(store.get_db(), record_node_id).await?;
        let judge_data = Record::new(record_node_id).status_by_id(store).await?;
        Ok((record, judge_data))
    }
}
