use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct PermGroupNode {
    pub node_id: i64,
    pub node_iden: String,
    pub name: String,
    pub description: String,
    pub creation_time: i64,
    pub creation_order: i64,
    pub avatar: String,
}

// impl<'a> Node<'a> for PermGroupNode {
//     fn get_node_id(&self) -> i64 {
//         self.node_id
//     }

//     fn get_node_iden(&self) -> String {
//         self.node_iden.clone()
//     }

//     async fn from_db(db: &'a sea_orm::DatabaseConnection, node_id: i64) -> crate::Result<Self>
//     where
//         Self: Sized,
//     {
//         let model = crate::db::entity::node::perm_group::get_perm_group_by_nodeid(db, node_id).await?;
//         Ok(model.into())
//     }

//     fn get_outdegree(&self, _db: &sea_orm::DatabaseConnection) -> crate::Result<i64> {
//         Ok(0) // PermGroupNode does not have outgoing edges in the current design
//     }
// }
