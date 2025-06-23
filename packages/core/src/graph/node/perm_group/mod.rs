use serde::{Deserialize, Serialize};

use crate::graph::node::Node;

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

impl Node for PermGroupNode {
    fn get_node_id(&self) -> i64 {
        self.node_id
    }

    fn get_node_iden(&self) -> String {
        self.node_iden.clone()
    }
}
