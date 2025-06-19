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
    fn get_node_id(&self) -> u64;
    fn get_node_iden(&self) -> String;
}
