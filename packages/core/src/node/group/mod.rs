use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct GroupNode {
    pub node_id: u128,
    pub node_iden: String,
    pub public: GroupNodePublic,
    pub private: GroupNodePrivate,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct GroupNodePublic {
    pub name: String,
    pub description: String,
    pub creation_time: i64,
    pub creation_order: i64,
    pub avatar: String,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct GroupNodePrivate {
    pub info: Vec<String>,
}

impl GroupNode {
    pub fn get_node_id(&self) -> u128 {
        self.node_id
    }

    pub fn get_node_iden(&self) -> String {
        self.node_iden.clone()
    }
}
