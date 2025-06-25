pub mod group;
pub mod perm_group;
pub mod problem;
pub mod token;
pub mod user;

use crate::Result;
use sea_orm::DatabaseConnection;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NodeType {
    User,
    Token,
    Problem,
    Group,
    PermGroup,
}

impl From<NodeType> for &str {
    fn from(node_type: NodeType) -> Self {
        match node_type {
            NodeType::User => "user",
            NodeType::Token => "token",
            NodeType::Problem => "problem",
            NodeType::Group => "group",
            NodeType::PermGroup => "perm_group",
        }
    }
}

pub trait Node<'a> {
    fn get_node_id(&self) -> i64;
    fn get_node_iden(&self) -> String;
    fn from_db(
        db: &'a DatabaseConnection,
        node_id: i64,
    ) -> impl std::future::Future<Output = Result<Self>> + Send
    where
        Self: Sized;
    fn get_outdegree(&self, db: &DatabaseConnection) -> Result<i64>;
}
