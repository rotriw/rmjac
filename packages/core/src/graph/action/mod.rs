use crate::db::entity::node::node;
use crate::error::CoreError;
use crate::{Result, db};
use sea_orm::ColumnTrait;
use sea_orm::DatabaseConnection;
use sea_orm::EntityTrait;
use sea_orm::QueryFilter;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DefaultNodes {
    pub guest_user_node: i64,
    pub default_strategy_node: i64,
    pub default_iden_node: i64,
    pub default_system_node: i64,
}

pub async fn get_default_node(db: &DatabaseConnection) -> Result<DefaultNodes> {
    let mut result = DefaultNodes {
        guest_user_node: -1,
        default_strategy_node: -1,
        default_iden_node: -1,
        default_system_node: -1,
    };

    result.guest_user_node = db::entity::node::user::get_guest_user_node(db)
        .await
        .unwrap_or(-1);
    result.default_strategy_node = db::entity::node::perm_group::get_default_strategy_node(db)
        .await
        .unwrap_or(-1);
    result.default_iden_node = db::entity::node::iden::default_iden_node(db)
        .await
        .unwrap_or(-1);
    result.default_system_node = db::entity::node::pages::default_system_node(db)
        .await
        .unwrap_or(-1);
    if result.guest_user_node == -1 {
        log::warn!("no guest user node found in database");
    }
    if result.default_strategy_node == -1 {
        log::warn!("no default strategy node found in database");
    }
    if result.default_iden_node == -1 {
        log::warn!("no default iden node found in database")
    }
    if result.default_system_node == -1 {
        log::warn!("no default system node found in database")
    }
    Ok(result)
}

pub async fn get_node_type(db: &DatabaseConnection, node_id: i64) -> Result<String> {
    let node = node::Entity::find()
        .filter(node::Column::NodeId.eq(node_id))
        .one(db)
        .await?;
    if let Some(node) = node {
        Ok(node.node_type)
    } else {
        Err(CoreError::NotFound(format!(
            "Node with id {node_id} not found"
        )))
    }
}
