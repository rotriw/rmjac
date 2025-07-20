use sea_orm::QueryFilter;
use sea_orm::ColumnTrait;
use sea_orm::EntityTrait;
use crate::env::{
    PATH_VIS, SAVED_NODE_CIRCLE_ID, SAVED_NODE_PATH, SAVED_NODE_PATH_LIST, SAVED_NODE_PATH_REV,
};
use crate::graph::edge::{EdgeQuery, EdgeQueryPerm};
use crate::{db, Result};
use async_recursion::async_recursion;
use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};
use crate::db::entity::node::node;
use crate::error::CoreError;

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

#[async_recursion(?Send)]
pub async fn has_path_dfs<T: EdgeQuery + EdgeQueryPerm>(
    db: &DatabaseConnection,
    u: i64,
    v: i64,
    edge_type: &T,
    required_perm: i64,
    ckid: i32,
    step: i64,
    max_step: i64,
) -> Result<i8> {
    if step > max_step {
        return Ok(-1);
    }
    if let Some(x) = SAVED_NODE_PATH
        .lock()
        .unwrap()
        .get(&(u, T::get_edge_type().to_string()))
        .and_then(|m| m.get(&u))
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
            edge_type,
            required_perm,
            ckid,
            step + 1,
            max_step,
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
    (*ckid) += 1;
    (*ckid) %= 1000;
    let mut d = (*PATH_VIS).lock().unwrap();
    if d.contains_key(&(*ckid)) {
        d.remove(&(*ckid));
    }
    d.insert(*ckid, std::collections::HashMap::new());
    (*ckid).clone()
}

pub async fn has_path<T: EdgeQuery + EdgeQueryPerm>(
    db: &DatabaseConnection,
    u: i64,
    v: i64,
    edge_type: &T,
    required_perm: i64,
) -> Result<i8> {
    let empty = vec![];
    let value = SAVED_NODE_PATH_LIST.lock().unwrap();
    let data = value.get(T::get_edge_type()).unwrap_or(&empty);
    for path in data {
        let path = *path;
        if let Some(x) = SAVED_NODE_PATH
            .lock()
            .unwrap()
            .get(&(path, T::get_edge_type().to_string()))
            .and_then(|m| m.get(&v))
        {
            if T::check_perm(required_perm, *x) {
                if let Some(x) = SAVED_NODE_PATH_REV
                    .lock()
                    .unwrap()
                    .get(&(path, T::get_edge_type().to_string()))
                    .and_then(|m| m.get(&u))
                {
                    if T::check_perm(required_perm, *x) {
                        return Ok(1);
                    }
                }
            }
        }
    }
    let ckid = gen_ckid();
    Ok(has_path_dfs(&db, u, v, edge_type, required_perm, ckid, 0, 100).await?)
}

// 暂时想不到怎么优化。
// pub async fn init_spot_forward<T: EdgeQuery + EdgeQueryPerm>(
//     db: &DatabaseConnection,
//     edge_type: &T,
//     spot_node_id: i64,
//     ckid: i32,
// ) -> Result<()> {
//     let mut que = Queue::new();
//     que.queue(spot_node_id);
//     while let Some(u)= que.dequeue() {
//         if path_vis![ckid, u] {
//             continue;
//         }
//         path_vis_insert![ckid, u];
//         let nv = T::get_perm_v(u, db).await?;
//         for ver in nv {
//             if ver.0 == spot_node_id {
//                 continue;
//             }
//             if !T::check_perm(ver.1, 1) {
//                 continue;
//             }
//             if let Some(x) = SAVED_NODE_PATH
//                  .lock()
//                 .unwrap()
//                 .get(&(ver.0, T::get_edge_type().to_string()))
//             {
//                 if x.contains_key(&spot_node_id) {
//                     continue;
//                 }
//             }
//             que.queue(ver.0);
//         }
//     }
//     Ok(())
// }

// pub async fn init_spot_reverse<T: EdgeQuery + EdgeQueryPerm>(
//     db: &DatabaseConnection,
//     edge_type: &T,
//     spot_node_id: i64,
// ) -> Result<()> {
// }

// pub async fn init_spot<T: EdgeQuery + EdgeQueryPerm>(
//     db: &DatabaseConnection,
//     edge_type: &T,
//     spot_node_id: i64,
// ) -> Result<()> {
//     let ckid = gen_ckid();
//     init_spot_forward(db, edge_type, spot_node_id).await?;
//     init_spot_reverse(db, edge_type, spot_node_id).await?;
//     let mut save_path_list = SAVED_NODE_PATH_LIST.lock().unwrap();
//     if (*save_path_list)
//         .get_mut(T::get_edge_type())
//         .is_none()
//     {
//         save_path_list.insert(T::get_edge_type().to_string(), vec![]);
//     }
//     save_path_list
//         .get_mut(T::get_edge_type())
//         .unwrap()
//         .push(spot_node_id);
//     Ok(())
// }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DefaultNodes {
    pub guest_user_node: i64,
    pub default_strategy_node: i64,
}

pub async fn get_default_node(db: &DatabaseConnection) -> Result<DefaultNodes> {
    let mut result = DefaultNodes {
        guest_user_node: -1,
        default_strategy_node: -1,
    };

    result.guest_user_node = db::entity::node::user::get_guest_user_node(db).await?;
    result.default_strategy_node =
        db::entity::node::perm_group::get_default_strategy_node(db).await?;
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
        Err(CoreError::NotFound(format!("Node with id {} not found", node_id)))
    }
}