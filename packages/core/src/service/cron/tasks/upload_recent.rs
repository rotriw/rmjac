use serde::{Deserialize, Serialize};
use crate::env::db::get_connect;
use crate::error::CoreError;
use crate::graph::node::user::remote_account::VjudgeNode;
use crate::model::vjudge::VjudgeAccount;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadRecentTaskProps {
    pub vjudge_node: VjudgeNode,
    pub range: String,
    pub user_id: i64
}

use crate::Result;

pub async fn upload_recent_task(
    props: UploadRecentTaskProps
) -> Result<String> {
    let db = get_connect().await;
    if let Err(e) = db {
        return Err(CoreError::StringError(format!("Database connection error: {}", e)));
    }
    let db = db.unwrap();
    let result = VjudgeAccount {
        node_id: props.vjudge_node.node_id
    }.add_task(&db, props.user_id, props.range, None).await?;
    Ok(format!("Upload recent task add node_id: {}", result.node_id))
}