use crate::Result;
use crate::db::entity::edge::{DbEdgeActiveModel, DbEdgeInfo};
use crate::graph::action::has_path;
use crate::graph::edge::{Edge, EdgeQuery, EdgeQueryPerm};
use sea_orm::{
    ActiveModelBehavior, ActiveModelTrait, DatabaseConnection, EntityTrait, IntoActiveModel,
};

pub async fn check_perm<DbActive, DbModel, DbEntity, EdgeA, T, K: Into<i64>>(
    db: &DatabaseConnection,
    u: i64,
    v: i64,
    edge_type: T,
    perm: K,
) -> Result<i8>
where
    DbActive: DbEdgeActiveModel<DbModel, EdgeA>
        + Sized
        + Send
        + Sync
        + ActiveModelTrait
        + ActiveModelBehavior
        + DbEdgeInfo,
    DbModel: Into<EdgeA>
        + From<<<DbActive as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Model>,
    <DbActive::Entity as EntityTrait>::Model: IntoActiveModel<DbActive>,
    <DbEntity as sea_orm::EntityTrait>::Model: Into<DbModel>,
    EdgeA: Edge<DbActive, DbModel, DbEntity>,
    DbEntity: EntityTrait,
    T: Sized + Send + Sync + Clone + EdgeQuery<DbActive, DbModel, DbEntity, EdgeA> + EdgeQueryPerm,
{
    has_path(db, u, v, &edge_type, perm.into()).await
}
