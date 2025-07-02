use crate::db::entity::edge::{edge::create_edge, DbEdgeActiveModel, DbEdgeInfo};
use crate::Result;
use sea_orm::{
    ActiveModelBehavior, ActiveModelTrait, DatabaseConnection, EntityTrait, IntoActiveModel,
};

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

pub mod perm_manage;
pub mod perm_view;
pub mod problem_limit;
pub mod problem_statement;
pub mod problem_tag;

pub trait EdgeQuery {
    fn get_v(
        u: i64,
        db: &DatabaseConnection,
    ) -> impl std::future::Future<Output = Result<Vec<i64>>>;
    fn get_perm_v(
        i: i64,
        db: &DatabaseConnection,
    ) -> impl std::future::Future<Output = Result<Vec<(i64, i64)>>>;
    fn get_edge_type() -> &'static str;
    fn check_perm(perm_a: i64, perm_b: i64) -> bool {
        // perm_b require perm_A ?
        (perm_a & perm_b) == perm_a
    }
}

pub trait Edge {
    fn get_edge_id(&self) -> i64;
    fn from_db(
        db: &DatabaseConnection,
        edge_id: i64,
    ) -> impl std::future::Future<Output = Result<Self>> + Send
    where
        Self: Sized;
}

pub trait EdgeRaw<Edge, EdgeModel, EdgeActive>
where
    Self: Into<EdgeActive> + Clone + Send + Sync,
    EdgeModel: Into<Edge>
        + Send
        + Sync
        + From<<<EdgeActive as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Model>,
    EdgeActive: DbEdgeActiveModel<EdgeModel, Edge>
        + Sized
        + Send
        + Sync
        + ActiveModelTrait
        + ActiveModelBehavior
        + DbEdgeInfo,
    <EdgeActive::Entity as EntityTrait>::Model: IntoActiveModel<EdgeActive> + Send + Sync,
{
    fn get_edge_type(&self) -> &str;
    fn get_edge_id_column(&self) -> <EdgeActive::Entity as EntityTrait>::Column;
    fn save(&self, db: &DatabaseConnection) -> impl std::future::Future<Output = Result<Edge>> {
        async {
            use tap::Conv;
            let edge_type = self.get_edge_type();
            let edge_id = create_edge(db, edge_type).await?.edge_id;
            let mut value = (*self).clone().conv::<EdgeActive>();
            value.set(self.get_edge_id_column(), edge_id.into());
            Ok(value.save_into_db(db).await?.into())
        }
    }
}
