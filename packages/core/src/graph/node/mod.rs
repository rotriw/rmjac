pub mod group;
pub mod pages;
pub mod perm_group;
pub mod problem;
pub mod token;
pub mod user;

use crate::{
    db::entity::node::{node::create_node, DbNodeActiveModel, DbNodeInfo},
    Result,
};
use sea_orm::{
    ActiveModelBehavior, ActiveModelTrait, DatabaseConnection, EntityTrait, IntoActiveModel,
};

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

pub trait Node {
    fn get_node_id(&self) -> i64;
    fn from_db(
        db: &DatabaseConnection,
        node_id: i64,
    ) -> impl std::future::Future<Output = Result<Self>>
    where
        Self: Sized;
}

pub trait NodeRaw<Node, DbModel, DbNodeActive>
where
    Self: Into<DbNodeActive> + Clone,
    DbModel: Into<Node>
        + From<<<DbNodeActive as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Model>,
    DbNodeActive: DbNodeActiveModel<DbModel, Node>
        + Sized
        + Send
        + Sync
        + ActiveModelTrait
        + ActiveModelBehavior
        + DbNodeInfo,
    <DbNodeActive::Entity as EntityTrait>::Model: IntoActiveModel<DbNodeActive>,
{
    fn get_node_type(&self) -> &str;
    fn get_node_id_column(&self) -> <DbNodeActive::Entity as EntityTrait>::Column;
    fn save(&self, db: &DatabaseConnection) -> impl std::future::Future<Output = Result<Node>> {
        async {
            use tap::Conv;
            let node_type = self.get_node_type();
            let node_id = create_node(db, node_type).await?.node_id;
            let mut value = (*self).clone().conv::<DbNodeActive>();
            value.set(self.get_node_id_column(), node_id.into());
            Ok(value.save_into_db(db).await?.into())
        }
    }
}
