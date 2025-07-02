use sea_orm::DatabaseConnection;

use crate::env::{PATH_VIS, SAVED_NODE_PATH};
use crate::graph::edge::EdgeQuery;
use crate::Result;

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

pub async fn has_path<T: EdgeQuery>(
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
        .get(&u)
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
        let val = has_path(
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
