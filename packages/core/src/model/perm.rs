use sea_orm::DatabaseConnection;
use crate::graph::action::has_path;
use crate::Result;
use crate::graph::edge::{EdgeQuery, EdgeQueryPerm};

pub async fn check_perm<T: EdgeQuery + EdgeQueryPerm, K: Into<i64>>(
    db: &DatabaseConnection,
    u: i64,
    v: i64,
    edge_type: T,
    perm: K
) -> Result<i8> {
    has_path(db, u, v, &edge_type, perm.into()).await
}