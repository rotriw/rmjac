use serde::{Deserialize, Serialize};

use crate::node::Node;

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct UserNodePublic {
    pub name: String,
    pub email: String,
    pub creation_time: i64,
    pub creation_order: i64,
    pub last_login_time: String,
    pub avatar: String,
    pub description: String,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct UserNodePrivate {
    pub password: String,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct UserNode {
    pub node_id: u128,
    pub node_iden: String,
    pub public: UserNodePublic,
    pub private: UserNodePrivate,
}

impl Node for UserNode {
    fn get_node_id(&self) -> u128 {
        self.node_id
    }

    fn get_node_iden(&self) -> String {
        self.node_iden.clone()
    }
}
