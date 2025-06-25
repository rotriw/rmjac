use sea_orm::DatabaseConnection;

use crate::{db::entity, error::CoreError};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EdgeType {
    PermView,
}

impl<'a> From<EdgeType> for &'a str {
    fn from(edge_type: EdgeType) -> Self {
        match edge_type {
            EdgeType::PermView => "perm_view",
        }
    }
}
