pub mod topo;

use crate::db::entity::edge::{DbEdgeActiveModel, DbEdgeInfo};
use crate::db::entity::node::node;
use crate::env::{
    PATH_VIS, PERM_GRAPH, SAVED_NODE_CIRCLE_ID, SAVED_NODE_PATH, SAVED_NODE_PATH_LIST,
    SAVED_NODE_PATH_REV,
};
use crate::error::CoreError;
use crate::graph::action::topo::TopoGraph;
use crate::graph::edge::{Edge, EdgeQuery, EdgeQueryPerm};
use crate::{Result, db};
use async_recursion::async_recursion;
use sea_orm::ColumnTrait;
use sea_orm::DatabaseConnection;
use sea_orm::EntityTrait;
use sea_orm::{ActiveModelBehavior, ActiveModelTrait, IntoActiveModel, QueryFilter};
use serde::{Deserialize, Serialize};

pub async fn load_perm_graph(db: &DatabaseConnection) -> Result<()> {
    use crate::graph::edge::perm_manage::PermManageEdgeQuery;
    use crate::graph::edge::perm_pages::PermPagesEdgeQuery;
    use crate::graph::edge::perm_problem::PermProblemEdgeQuery;
    use crate::graph::edge::perm_system::PermSystemEdgeQuery;
    use crate::graph::edge::perm_view::PermViewEdgeQuery;

    log::info!("Loading permission graph from database...");

    let mut graph = crate::env::PermGraph::new();

    // 加载 perm_view 边
    log::info!("Loading perm_view edges...");
    let perm_view_edges = PermViewEdgeQuery::get_all(db).await?;
    log::info!("Loaded {} perm_view edges", perm_view_edges.len());
    for (u, v, perm) in perm_view_edges {
        // get_all 返回 (u_node_id, v_node_id, perm)，我们没有 edge_id，使用 0 作为占位符
        graph.add_edge("perm_view", u, v, 0, perm);
    }

    // 加载 perm_manage 边
    log::info!("Loading perm_manage edges...");
    let perm_manage_edges = PermManageEdgeQuery::get_all(db).await?;
    log::info!("Loaded {} perm_manage edges", perm_manage_edges.len());
    for (u, v, perm) in perm_manage_edges {
        graph.add_edge("perm_manage", u, v, 0, perm);
    }

    // 加载 perm_pages 边
    log::info!("Loading perm_pages edges...");
    let perm_pages_edges = PermPagesEdgeQuery::get_all(db).await?;
    log::info!("Loaded {} perm_pages edges", perm_pages_edges.len());
    for (u, v, perm) in perm_pages_edges {
        graph.add_edge("perm_pages", u, v, 0, perm);
    }

    // 加载 perm_problem 边
    log::info!("Loading perm_problem edges...");
    let perm_problem_edges = PermProblemEdgeQuery::get_all(db).await?;
    log::info!("Loaded {} perm_problem edges", perm_problem_edges.len());
    for (u, v, perm) in perm_problem_edges {
        graph.add_edge("perm_problem", u, v, 0, perm);
    }

    // 加载 perm_system 边
    log::info!("Loading perm_system edges...");
    let perm_system_edges = PermSystemEdgeQuery::get_all(db).await?;
    log::info!("Loaded {} perm_system edges", perm_system_edges.len());
    for (u, v, perm) in perm_system_edges {
        graph.add_edge("perm_system", u, v, 0, perm);
    }

    // 将加载的图写入全局状态
    let mut perm_graph = PERM_GRAPH.write().unwrap();
    *perm_graph = graph;

    log::info!("Permission graph loaded successfully!");
    Ok(())
}

/// 向权限图中添加一条边（当创建新的权限边时调用）
pub fn add_perm_edge(edge_type: &str, u: i64, v: i64, edge_id: i64, perm: i64) {
    let mut graph = PERM_GRAPH.write().unwrap();
    graph.add_edge(edge_type, u, v, edge_id, perm);
    log::debug!(
        "Added perm edge: {} {} -> {} (perm: {})",
        edge_type,
        u,
        v,
        perm
    );
}

/// 从权限图中删除一条边（通过边ID）
pub fn remove_perm_edge_by_id(edge_type: &str, edge_id: i64) {
    let mut graph = PERM_GRAPH.write().unwrap();
    graph.remove_edge_by_id(edge_type, edge_id);
    log::debug!("Removed perm edge by id: {} {}", edge_type, edge_id);
}

/// 从权限图中删除指定 u -> v 的边
pub fn remove_perm_edge(edge_type: &str, u: i64, v: i64) {
    let mut graph = PERM_GRAPH.write().unwrap();
    graph.remove_edge(edge_type, u, v);
    log::debug!("Removed perm edge: {} {} -> {}", edge_type, u, v);
}

/// 非 async 的权限检查函数
/// 使用内存中的 PermGraph 进行 DFS 检查
///
/// 返回值：
/// - 1: 有权限
/// - 0: 无权限
/// - -1: 超过最大步数
pub fn check_perm_sync(edge_type: &str, u: i64, v: i64, required_perm: i64) -> i8 {
    let graph = PERM_GRAPH.read().unwrap();
    graph.check_perm_multi(edge_type, u, v, required_perm, 100)
}

/// 检查单个权限位的同步版本
pub fn check_perm_single_sync(edge_type: &str, u: i64, v: i64, required_perm: i64) -> i8 {
    let graph = PERM_GRAPH.read().unwrap();
    graph.check_perm_dfs(edge_type, u, v, required_perm, 100)
}

// ============================================================================
// 旧的基于数据库的权限检查系统（保留以便兼容）
// ============================================================================

macro_rules! path_vis {
    [$ckid:expr,$u:expr] => {
        PATH_VIS
            .lock()
            .unwrap()
            .get(&$ckid)
            .and_then(|m| m.get(&$u))
            .is_some()
    };
}

macro_rules! path_vis_insert {
    [$ckid:expr,$u:expr] => {
        PATH_VIS
            .lock()
            .unwrap()
            .entry($ckid)
            .or_default()
            .insert($u, true);
    };
}

#[allow(clippy::too_many_arguments)]
#[async_recursion(?Send)]
#[deprecated(note = "Use check_perm_sync instead for better performance")]
pub async fn has_path_dfs_database<DbActive, DbModel, DbEntity, EdgeA, T>(
    db: &DatabaseConnection,
    u: i64,
    v: i64,
    _edge_type: &T,
    required_perm: i64,
    ckid: i32,
    step: i64,
    max_step: i64,
    no_check: bool,
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
    log::trace!("Check perm from {u} -> {v}, now_step: {step}, required_perm: {required_perm}");
    if step > max_step {
        return Ok(-1);
    }
    if !no_check
        && let Some(x) = SAVED_NODE_PATH
            .lock()
            .unwrap()
            .get(&(u, T::get_edge_type().to_string()))
        && let Some(x) = x.get(&v)
    {
        if T::check_perm(required_perm, *x) {
            return Ok(1);
        } else {
            return Ok(0);
        }
    }
    if path_vis![ckid, u] {
        path_vis_insert![ckid, u];
    }
    let nv = T::get_perm_v(u, db).await?;
    for ver in nv {
        if path_vis![ckid, ver.0] {
            continue;
        }
        if !T::check_perm(required_perm, ver.1) {
            continue;
        }
        if ver.0 == v {
            return Ok(1);
        }
        #[allow(deprecated)]
        let val = has_path_dfs_database(
            db,
            ver.0,
            v,
            _edge_type,
            required_perm,
            ckid,
            step + 1,
            max_step,
            no_check,
        )
        .await?;
        if val == -1 {
            return Ok(-1);
        } else if val == 1 {
            return Ok(1);
        }
    }

    Ok(0)
}

pub fn gen_ckid() -> i32 {
    let mut ckid = SAVED_NODE_CIRCLE_ID.lock().unwrap();
    *ckid += 1;
    *ckid %= 1000;
    let mut d = (*PATH_VIS).lock().unwrap();
    if d.contains_key(&(*ckid)) {
        d.remove(&(*ckid));
    }
    d.insert(*ckid, std::collections::HashMap::new());
    *ckid
}

/// 旧的 async 权限检查函数
/// 现在内部使用新的同步检查，不再访问数据库
#[deprecated(note = "Use check_perm_sync instead for better performance")]
pub async fn has_path<DbActive, DbModel, DbEntity, EdgeA, T>(
    _db: &DatabaseConnection,
    u: i64,
    v: i64,
    _edge_type: &T,
    required_perm: i64,
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
    T: EdgeQuery<DbActive, DbModel, DbEntity, EdgeA> + EdgeQueryPerm + Sized + Send + Sync + Clone,
{
    // 使用新的同步检查
    Ok(check_perm_sync(T::get_edge_type(), u, v, required_perm))
}

pub fn lowbit(x: i64) -> i64 {
    x & (-x)
}

#[allow(unused_variables)]
pub async fn init_spot<DbActive, DbModel, DbEntity, EdgeA, T>(
    db: &DatabaseConnection,
    edge_type: &T,
    spot_node_id: i64,
    node_number: i64,
) -> Result<()>
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
    // 正向建图。
    let mut edge_data = vec![];
    log::info!("init spot, node_number: {node_number}");
    log::info!("start to collect graph data from db");
    let data = T::get_all(db).await?;
    log::info!("edge number: {}", data.len());
    for i in data {
        edge_data.push((i.0, i.1, i.2));
    }
    log::info!("end collected");
    log::info!("start to run in each perm");
    for i in T::get_perm_iter() {
        if i == -1 {
            continue;
        }
        log::info!("start to run perm(number: {i})");
        log::info!("start to build graph");
        let (mut graph, mut anti_graph) =
            (TopoGraph::new(node_number), TopoGraph::new(node_number));
        for &(u, v, perm) in &edge_data {
            let perm = i & perm;
            graph.add_edge(u, v, (perm != 0) as i8);
            anti_graph.add_edge(v, u, (perm != 0) as i8);
        }
        log::info!("end to build graph");
        log::info!("start to get topo sort");
        graph.init(spot_node_id);
        anti_graph.init(spot_node_id);
        for j in 1..=node_number {
            let result = graph.result.get(&j).unwrap_or(&0);
            let anti_result = anti_graph.result.get(&j).unwrap_or(&0);
            // save graph into SAVED_NODE_PATH
            if ((*result) as i64) > 0 {
                *SAVED_NODE_PATH
                    .lock()
                    .unwrap()
                    .entry((spot_node_id, T::get_edge_type().to_string()))
                    .or_default()
                    .entry(j)
                    .or_insert(0) |= i;
            }
            if ((*anti_result) as i64) > 0 {
                *SAVED_NODE_PATH_REV
                    .lock()
                    .unwrap()
                    .entry((spot_node_id, T::get_edge_type().to_string()))
                    .or_default()
                    .entry(j)
                    .or_insert(0) |= i;
            }
        }
        log::info!("end to get topo sort");
    }
    SAVED_NODE_PATH_LIST
        .lock()
        .unwrap()
        .entry(T::get_edge_type().to_string())
        .or_default()
        .push(spot_node_id);
    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DefaultNodes {
    pub guest_user_node: i64,
    pub default_strategy_node: i64,
    pub default_iden_node: i64,
    pub default_system_node: i64,
}

pub async fn get_default_node(db: &DatabaseConnection) -> Result<DefaultNodes> {
    let mut result = DefaultNodes {
        guest_user_node: -1,
        default_strategy_node: -1,
        default_iden_node: -1,
        default_system_node: -1,
    };

    result.guest_user_node = db::entity::node::user::get_guest_user_node(db)
        .await
        .unwrap_or(-1);
    result.default_strategy_node = db::entity::node::perm_group::get_default_strategy_node(db)
        .await
        .unwrap_or(-1);
    result.default_iden_node = db::entity::node::iden::default_iden_node(db)
        .await
        .unwrap_or(-1);
    result.default_system_node = db::entity::node::pages::default_system_node(db)
        .await
        .unwrap_or(-1);
    if result.guest_user_node == -1 {
        log::warn!("no guest user node found in database");
    }
    if result.default_strategy_node == -1 {
        log::warn!("no default strategy node found in database");
    }
    if result.default_iden_node == -1 {
        log::warn!("no default iden node found in database")
    }
    if result.default_system_node == -1 {
        log::warn!("no default system node found in database")
    }
    Ok(result)
}

pub async fn get_node_type(db: &DatabaseConnection, node_id: i64) -> Result<String> {
    let node = node::Entity::find()
        .filter(node::Column::NodeId.eq(node_id))
        .one(db)
        .await?;
    if let Some(node) = node {
        Ok(node.node_type)
    } else {
        Err(CoreError::NotFound(format!(
            "Node with id {node_id} not found"
        )))
    }
}
