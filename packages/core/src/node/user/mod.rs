use serde::{Deserialize, Serialize};

use crate::node::Node;

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct UserNodePublic {
    pub name: String,
    pub email: String,
    pub creation_time: i64,
    pub creation_order: u64,
    pub last_login_time: String,
    pub avatar: String,
    pub description: String,
    pub bio: String,
    pub profile_show: Vec<String>,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct UserNodePrivate {
    pub password: String,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct UserNode {
    pub node_id: u64,
    pub node_iden: String,
    pub public: UserNodePublic,
    pub private: UserNodePrivate,
}

impl Node for UserNode {
    fn get_node_id(&self) -> u64 {
        self.node_id
    }

    fn get_node_iden(&self) -> String {
        self.node_iden.clone()
    }
}
