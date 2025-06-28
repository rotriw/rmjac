pub mod group;
pub mod perm_group;
pub mod problem;
pub mod token;
pub mod user;

use crate::{
    db::entity::{edge::{edge::create_edge, DbEdgeActiveModel, DbEdgeInfo}, node::{node::create_node, DbNodeActiveModel, DbNodeInfo}},
    graph::{action::get_outdegree, edge::{EdgeRaw, EdgeType}},
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

#[allow(async_fn_in_trait)]
pub trait Node {
    fn get_node_id(&self) -> i64;
    fn get_node_iden(&self) -> String;
    fn from_db(
        db: &DatabaseConnection,
        node_id: i64,
    ) -> impl std::future::Future<Output = Result<Self>> + Send
    where
        Self: Sized;
    async fn get_outdegree(
        &self,
        db: &DatabaseConnection,
        edge_type: EdgeType,
    ) -> Result<Vec<(i64, i64)>> {
        let node_id = self.get_node_id();
        get_outdegree(db, node_id, edge_type).await
    }

    async fn get_outdegree_count(
        &self,
        db: &DatabaseConnection,
        edge_type: EdgeType,
    ) -> Result<i64> {
        let outdegree = self.get_outdegree(db, edge_type).await?;
        Ok(outdegree.len() as i64)
    }

    async fn get_indegree(
        &self,
        db: &DatabaseConnection,
        edge_type: EdgeType,
    ) -> Result<Vec<(i64, i64)>> {
        let node_id = self.get_node_id();
        edge_type.get_indegree(db, node_id).await
    }

    async fn get_indegree_count(
        &self,
        db: &DatabaseConnection,
        edge_type: EdgeType,
    ) -> Result<i64> {
        let indegree = self.get_indegree(db, edge_type).await?;
        Ok(indegree.len() as i64)
    }
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
    fn get_node_iden(&self) -> &str;
    fn get_node_id_column(&self) -> <DbNodeActive::Entity as EntityTrait>::Column;
    fn get_node_iden_column(&self) -> <DbNodeActive::Entity as EntityTrait>::Column;
    async fn save(&self, db: &DatabaseConnection) -> Result<Node> {
        use tap::Conv;
        let node_iden = self.get_node_iden();
        let node_type = self.get_node_type();
        let node_id = create_node(db, node_iden, node_type).await?.node_id;
        let mut value = (*self).clone().conv::<DbNodeActive>();
        value.set(self.get_node_id_column(), node_id.into());
        // value.set(self.get_node_iden_column(), node_iden.into());
        Ok(value.save_into_db(db)
            .await?
            .into())
    }
}
