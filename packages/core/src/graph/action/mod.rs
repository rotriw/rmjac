pub mod topo;

use crate::db::entity::edge::{DbEdgeActiveModel, DbEdgeInfo};
use crate::db::entity::node::node;
use crate::env::{
    PATH_VIS, SAVED_NODE_CIRCLE_ID, SAVED_NODE_PATH, SAVED_NODE_PATH_LIST, SAVED_NODE_PATH_REV,
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
pub async fn has_path_dfs<DbActive, DbModel, DbEntity, EdgeA, T>(
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
    DbModel: Into<EdgeA>
        + From<<<DbActive as ActiveModelTrait>::Entity as EntityTrait>::Model>,
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
        let val = has_path_dfs(
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

pub async fn has_path<DbActive, DbModel, DbEntity, EdgeA, T>(
    db: &DatabaseConnection,
    u: i64,
    v: i64,
    edge_type: &T,
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
    DbModel: Into<EdgeA>
        + From<<<DbActive as ActiveModelTrait>::Entity as EntityTrait>::Model>,
    <DbActive::Entity as EntityTrait>::Model: IntoActiveModel<DbActive>,
    <DbEntity as EntityTrait>::Model: Into<DbModel>,
    EdgeA: Edge<DbActive, DbModel, DbEntity>,
    DbEntity: EntityTrait,
    T: EdgeQuery<DbActive, DbModel, DbEntity, EdgeA> + EdgeQueryPerm + Sized + Send + Sync + Clone,
{
    let empty = vec![];
    let data = SAVED_NODE_PATH_LIST
        .lock()
        .unwrap()
        .get(T::get_edge_type())
        .unwrap_or(&empty)
        .clone();
    for path in data {
        if let Some(x) = SAVED_NODE_PATH
            .lock()
            .unwrap()
            .get(&(path, T::get_edge_type().to_string()))
            .and_then(|m| m.get(&v)) && T::check_perm(required_perm, *x) && let Some(x) = SAVED_NODE_PATH_REV
            .lock()
            .unwrap()
            .get(&(path, T::get_edge_type().to_string()))
            .and_then(|m| m.get(&u))
        {
            log::debug!("Cache hit.{u} -> {v}, perm: {x}");
            if T::check_perm(required_perm, *x) {
                return Ok(1);
            }
        }
    }
    let ckid = gen_ckid();
    let mut required_perm = required_perm;
    while required_perm > 0 {
        let res = has_path_dfs(
            db,
            u,
            v,
            edge_type,
            lowbit(required_perm),
            ckid,
            0,
            100,
            false,
        )
        .await?;
        if res < 1 {
            return Ok(res);
        }
        required_perm -= lowbit(required_perm);
    }
    Ok(1)
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
    DbModel: Into<EdgeA>
        + From<<<DbActive as ActiveModelTrait>::Entity as EntityTrait>::Model>,
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
    pub default_training_iden_node: i64
}

pub async fn get_default_node(db: &DatabaseConnection) -> Result<DefaultNodes> {
    let mut result = DefaultNodes {
        guest_user_node: -1,
        default_strategy_node: -1,
        default_training_iden_node: -1,
    };

    result.guest_user_node = db::entity::node::user::get_guest_user_node(db).await?;
    result.default_strategy_node =
        db::entity::node::perm_group::get_default_strategy_node(db).await?;
    result.default_training_iden_node = db::entity::node::iden::get_default_training_iden_node(db).await?;
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
