use sea_orm::DatabaseConnection;
use crate::{db::entity::edge::{self, perm_manage}, Result};


// pub async fn create_manage_edge(
//     db: &DatabaseConnection,
//     from_node_id: i64,
//     to_node_id: i64,
// ) -> Result<()> {
//     let edge_id = if let Some(id) = edge_id {
//         id
//     } else {
//         edge::edge::create_edge(db, "perm_manage").await?.edge_id
//     };
//     perm_manage::new_perm_manage_edge(db, edge_id, , v_id, perms)
// }