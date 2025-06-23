pub mod group;
pub mod perm_group;
pub mod user;
pub mod token;

use crate::env;
use crate::graph::node::group::GroupNode;
use crate::graph::node::perm_group::PermGroupNode;
use crate::graph::node::user::UserNode;
use crate::Result;
use enumx::export::*;
use enumx::predefined::*;


pub enum NodeResult {
    User(UserNode),
    Group(GroupNode),
    PermGroup(PermGroupNode),
}

pub trait Node {
    fn get_node_id(&self) -> i64;
    fn get_node_iden(&self) -> String;
}
