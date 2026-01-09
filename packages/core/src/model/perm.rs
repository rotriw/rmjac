use crate::Result;
use crate::db::entity::edge::{DbEdgeActiveModel, DbEdgeInfo};
use crate::graph::action::{
    add_perm_edge, check_perm_sync, remove_perm_edge, remove_perm_edge_by_id,
};
use crate::graph::edge::{Edge, EdgeQuery, EdgeQueryPerm};
use sea_orm::{
    ActiveModelBehavior, ActiveModelTrait, DatabaseConnection, EntityTrait, IntoActiveModel,
};

// ============================================================================
// 新的同步权限检查 API
// ============================================================================

/// 同步检查权限（非 async）
/// 使用内存中的权限图进行 DFS 检查
///
/// # Arguments
/// * `edge_type` - 边类型名称（如 "perm_system", "perm_problem" 等）
/// * `u` - 源节点ID
/// * `v` - 目标节点ID
/// * `perm` - 需要的权限值
///
/// # Returns
/// * `1` - 有权限
/// * `0` - 无权限
/// * `-1` - 超过最大搜索步数
pub fn check_perm_by_type<K: Into<i64>>(edge_type: &str, u: i64, v: i64, perm: K) -> i8 {
    check_perm_sync(edge_type, u, v, perm.into())
}

/// 检查 perm_system 权限
pub fn check_system_perm<K: Into<i64>>(u: i64, v: i64, perm: K) -> i8 {
    check_perm_sync("perm_system", u, v, perm.into())
}

/// 检查 perm_problem 权限
pub fn check_problem_perm<K: Into<i64>>(u: i64, v: i64, perm: K) -> i8 {
    check_perm_sync("perm_problem", u, v, perm.into())
}

/// 检查 perm_pages 权限
pub fn check_pages_perm<K: Into<i64>>(u: i64, v: i64, perm: K) -> i8 {
    check_perm_sync("perm_pages", u, v, perm.into())
}

/// 检查 perm_view 权限
pub fn check_view_perm<K: Into<i64>>(u: i64, v: i64, perm: K) -> i8 {
    check_perm_sync("perm_view", u, v, perm.into())
}

/// 检查 perm_manage 权限
pub fn check_manage_perm<K: Into<i64>>(u: i64, v: i64, perm: K) -> i8 {
    check_perm_sync("perm_manage", u, v, perm.into())
}

/// 添加权限边到内存图（创建新边时调用）
pub fn add_perm_edge_to_graph(edge_type: &str, u: i64, v: i64, edge_id: i64, perm: i64) {
    add_perm_edge(edge_type, u, v, edge_id, perm);
}

/// 从内存图删除权限边（通过边ID）
pub fn remove_perm_edge_from_graph_by_id(edge_type: &str, edge_id: i64) {
    remove_perm_edge_by_id(edge_type, edge_id);
}

/// 从内存图删除权限边（通过 u -> v）
pub fn remove_perm_edge_from_graph(edge_type: &str, u: i64, v: i64) {
    remove_perm_edge(edge_type, u, v);
}

/// 旧的 async 权限检查函数
/// 现在内部使用同步检查，不再访问数据库
#[deprecated(note = "Use check_perm_by_type or specific check_*_perm functions instead")]
#[allow(unused_variables)]
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
    DbModel: Into<EdgeA> + From<<<DbActive as ActiveModelTrait>::Entity as EntityTrait>::Model>,
    <DbActive::Entity as EntityTrait>::Model: IntoActiveModel<DbActive>,
    <DbEntity as EntityTrait>::Model: Into<DbModel>,
    EdgeA: Edge<DbActive, DbModel, DbEntity>,
    DbEntity: EntityTrait,
    T: Sized + Send + Sync + Clone + EdgeQuery<DbActive, DbModel, DbEntity, EdgeA> + EdgeQueryPerm,
{
    Ok(check_perm_sync(T::get_edge_type(), u, v, perm.into()))
}
