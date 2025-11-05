use crate::Result;
use crate::graph::node::{Node, NodeRaw};
use crate::graph::node::record::{
    RecordNode, RecordNodePrivateRaw, RecordNodePublicRaw, RecordNodeRaw, RecordStatus,
};
use sea_orm::{DatabaseConnection, ColumnTrait};
use sea_orm::sea_query::IntoCondition;
use serde::{Deserialize, Serialize};
use crate::graph::edge::{EdgeQuery, EdgeRaw};
use crate::graph::edge::record::{RecordEdge, RecordEdgeQuery, RecordEdgeRaw};

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


pub async fn create_record_only_archived(
    db: &DatabaseConnection,
    record: RecordNewProp,
    user_node_id: i64,
    problem_node_id: i64,
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
            record_status: RecordStatus::OnlyArchived,
            statement_id: record.statement_node_id,
        },
        private: RecordNodePrivateRaw {
            code: record.code.to_string(),
            code_language: record.code_language.to_string(),
        },
    }
    .save(db)
    .await?;

    let user_edge = RecordEdgeRaw {
        u: user_node_id,
        v: record_node.node_id,
        record_status: RecordStatus::OnlyArchived,
        code_length: record_node.private.code.len() as i64,
        score: 0,
        submit_time: Default::default(),
        platform: "archived".to_string(),
    }.save(db).await?;

    let problem_edge = RecordEdgeRaw {
        u: problem_node_id,
        v: record_node.node_id,
        record_status: RecordStatus::OnlyArchived,
        code_length: record_node.private.code.len() as i64,
        score: 0,
        submit_time: Default::default(),
        platform: "archived".to_string(),
    }.save(db).await?;

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

pub async fn get_specific_node_records<T: IntoCondition>(
    db: &DatabaseConnection,
    node_id: i64,
    number_per_page: u64,
    page: u64,
    filter: Vec<T>,
) -> Result<Vec<RecordEdge>> {
    log::debug!("Getting public records for id: {}", node_id);
    use sea_orm::{QueryFilter, QueryOrder, PaginatorTrait, ColumnTrait};
    let page = if page < 1 {
        1
    } else {
        page
    };
    let mut offset = number_per_page * (page - 1);
    let data = RecordEdgeQuery::get_v_filter_extend_content(
        node_id,
        filter,
        db,
        Some(number_per_page),
        Some(offset)
    ).await?;
    Ok(data)
}