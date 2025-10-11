use crate::Result;
use crate::graph::node::{Node, NodeRaw};
use crate::graph::node::record::{
    RecordNode, RecordNodePrivateRaw, RecordNodePublicRaw, RecordNodeRaw, RecordStatus,
};
use sea_orm::{DatabaseConnection, ColumnTrait};
use serde::{Deserialize, Serialize};

#[allow(unused)]

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RecordNewProp {
    pub platform: String,
    pub code: String,
    pub code_language: String,
    pub url: String,
    pub statement_node_id: i64,
    pub public_status: bool,
}


#[allow(unused)]
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

/// Update record status (soft delete by marking as deleted)
/// Since Record nodes don't have edges, we implement status-based deletion
pub async fn update_record_status(
    db: &DatabaseConnection,
    record_node_id: i64,
    new_status: RecordStatus,
) -> Result<RecordNode> {
    log::info!("Updating record {} status to {:?}", record_node_id, new_status);

    let record_node = RecordNode::from_db(db, record_node_id).await?;

    use crate::db::entity::node::record::Column::RecordStatus;
    let updated_record = record_node.modify(db, RecordStatus, i64::from(new_status)).await?;

    log::info!("Successfully updated record {} status to {:?}", record_node_id, new_status);
    Ok(updated_record)
}

/// Soft delete a record by marking it as Deleted
/// Records don't have edges to delete, so we use status-based deletion
pub async fn soft_delete_record(
    db: &DatabaseConnection,
    record_node_id: i64,
) -> Result<RecordNode> {
    log::info!("Soft deleting record {}", record_node_id);

    update_record_status(db, record_node_id, RecordStatus::Deleted).await
}

/// Get records by statement node ID
pub async fn get_records_by_statement(
    db: &DatabaseConnection,
    statement_node_id: i64,
) -> Result<Vec<RecordNode>> {
    log::debug!("Finding records for statement node {}", statement_node_id);

    use crate::db::entity::node::record::Column::StatementId;
    let records = RecordNode::from_db_filter(db, StatementId.eq(statement_node_id)).await?;

    log::debug!("Found {} records for statement node {}", records.len(), statement_node_id);
    Ok(records)
}

/// Delete all records for a statement (soft delete by status)
/// Since records reference statements via statement_id field, not edges
pub async fn delete_records_for_statement(
    db: &DatabaseConnection,
    statement_node_id: i64,
) -> Result<Vec<RecordNode>> {
    log::info!("Deleting all records for statement node {}", statement_node_id);

    let records = get_records_by_statement(db, statement_node_id).await?;
    let mut deleted_records = Vec::new();

    for record in records {
        let deleted_record = soft_delete_record(db, record.node_id).await?;
        deleted_records.push(deleted_record);
    }

    log::info!("Successfully deleted {} records for statement node {}", deleted_records.len(), statement_node_id);
    Ok(deleted_records)
}

/// Update record score
pub async fn update_record_score(
    db: &DatabaseConnection,
    record_node_id: i64,
    score: i64,
) -> Result<RecordNode> {
    log::debug!("Updating record {} score to {}", record_node_id, score);

    let record_node = RecordNode::from_db(db, record_node_id).await?;

    use crate::db::entity::node::record::Column::RecordScore;
    let updated_record = record_node.modify(db, RecordScore, score).await?;

    log::debug!("Successfully updated record {} score to {}", record_node_id, score);
    Ok(updated_record)
}

/// Update record message
pub async fn update_record_message(
    db: &DatabaseConnection,
    record_node_id: i64,
    message: Option<String>,
) -> Result<RecordNode> {
    log::debug!("Updating record {} message", record_node_id);

    let record_node = RecordNode::from_db(db, record_node_id).await?;

    use crate::db::entity::node::record::Column::RecordMessage;
    let updated_record = record_node.modify(db, RecordMessage, message).await?;

    log::debug!("Successfully updated record {} message", record_node_id);
    Ok(updated_record)
}
