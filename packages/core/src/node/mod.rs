use crate::env;
use crate::node::group::GroupNode;
use crate::node::perm_group::PermGroupNode;
use crate::node::user::UserNode;
use crate::Result;
use enumx::export::*;
use enumx::predefined::*;

pub mod group;
pub mod perm_group;
pub mod user;

pub enum NodeResult {
    User(UserNode),
    Group(GroupNode),
    PermGroup(PermGroupNode),
}

pub trait Node {
    fn get_node_id(&self) -> u128;
    fn get_node_iden(&self) -> String;
}

pub fn new_node_id() -> u128 {
    let mut res = (*env::NODEID.lock().unwrap()).clone();
    res += 1;
    res.clone()
}
