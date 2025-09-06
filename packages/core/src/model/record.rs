use crate::Result;
use crate::graph::node::NodeRaw;
use crate::graph::node::record::{
    RecordNode, RecordNodePrivateRaw, RecordNodePublicRaw, RecordNodeRaw, RecordStatus,
};
use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RecordNewProp {
    pub platform: String,
    pub code: String,
    pub code_language: String,
    pub url: String,
    pub statement_node_id: i64,
    pub public_status: bool,
}
pub async fn create_record(
    db: &DatabaseConnection,
    record: RecordNewProp,
    track_service_id: i64,
) -> Result<RecordNode> {
    log::debug!("creating record schema with properties: {:?}", record);
    let record_node = RecordNodeRaw {
        public: RecordNodePublicRaw {
            record_message: None,
            record_platform: record.platform.to_string(),
            record_url: Some(record.url.to_string()),
            record_time: chrono::Utc::now().naive_utc(),
            public_status: record.public_status,
            record_score: 0,
            record_status: RecordStatus::Waiting,
            statement_id: record.statement_node_id,
        },
        private: RecordNodePrivateRaw {
            code: record.code.to_string(),
            code_language: record.code_language.to_string(),
        },
    }
    .save(db)
    .await?;
    log::debug!(
        "add judge task for record:{}, bind_track_service {track_service_id}",
        record_node.node_id
    );
    // todo!
    Ok(record_node)
}
