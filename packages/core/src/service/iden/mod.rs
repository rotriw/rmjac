use redis::TypedCommands;
use sea_orm::{ColumnTrait, DatabaseConnection};
use sea_orm::sea_query::SimpleExpr;
use crate::env::{DEFAULT_NODES, SLICE_WORD_ACMAC, SLICE_WORD_LIST};
use crate::error::QueryNotFound;
use crate::error::QueryExists;
use crate::graph::edge::{EdgeQuery, EdgeRaw};
use crate::graph::edge::iden::{IdenEdgeQuery, IdenEdgeRaw};
use crate::graph::node::iden::{IdenNodePrivateRaw, IdenNodePublicRaw, IdenNodeRaw};
use crate::graph::node::NodeRaw;
use crate::Result;

pub mod ac_automaton;


// 为多个 node_id 创建一个 iden。
pub async fn create_iden(iden: &str, node_ids: Vec<i64>, db: &DatabaseConnection) -> Result<()> {
    create_iden_with_slice(auto_slice_iden(iden), node_ids, db).await
}


pub async fn check_exist(iden: &str, db: &DatabaseConnection) -> Result<bool> {
    let mut now_id = DEFAULT_NODES.lock().unwrap().default_iden_node;
    use crate::db::entity::edge::iden::Column;
    let iden_slice = auto_slice_iden(iden);
    for (i, iden_part) in iden_slice.iter().enumerate() {
        let val =  IdenEdgeQuery::get_v_filter(now_id, Column::Iden.eq(*iden_part), db).await?;
        if i == iden_slice.len() - 1 {
            return Ok(!val.is_empty())
        }
        if val.is_empty() {
            return Ok(false);
        }
        if val.len() > 1 {
            log::error!("iden service have same error(iden_edge_many): {now_id} (fallback: choose first.)");
        }
        now_id = val[0];
    }
    // unreachable
    Ok(false)
}

pub async fn remove_iden_to_specific_node(iden: &str, node_id: i64, db: &DatabaseConnection) -> Result<()> {
    let mut now_id = DEFAULT_NODES.lock().unwrap().default_iden_node;
    use crate::db::entity::edge::iden::Column;
    let iden_slice = auto_slice_iden(iden);
    for (i, iden_part) in iden_slice.iter().enumerate() {
        let val =  IdenEdgeQuery::get_v_filter(now_id, Column::Iden.eq(*iden_part), db).await?;
        if val.is_empty() {
            return Err(QueryNotFound::IdenNotFound.into());
        }
        if val.len() > 1 {
            log::error!("iden service have same error(iden_edge_many): {now_id} (fallback: choose first.)");
        }
        if i == iden_slice.len() - 1 {
            let more_data = IdenEdgeQuery::get_v_filter_extend_content::<SimpleExpr>(now_id, vec![], db, None, None).await?;
            for cur_edge in more_data {
                if cur_edge.v == node_id {
                    IdenEdgeQuery::delete_from_id(db, cur_edge.id);
                }
            }
            return Ok(());
        }
        now_id = val[0];
    }
    Ok(())
}

pub async fn remove_iden(iden: &str, db: &DatabaseConnection) -> Result<()> {
    let mut now_id = DEFAULT_NODES.lock().unwrap().default_iden_node;
    use crate::db::entity::edge::iden::Column;
    let iden_slice = auto_slice_iden(iden);
    for (i, iden_part) in iden_slice.iter().enumerate() {
        let val =  IdenEdgeQuery::get_v_filter(now_id, Column::Iden.eq(*iden_part), db).await?;
        if val.is_empty() {
            return Err(QueryNotFound::IdenNotFound.into());
        }
        if val.len() > 1 {
            log::error!("iden service have same error(iden_edge_many): {now_id} (fallback: choose first.)");
        }
        if i == iden_slice.len() - 1 {
            let more_data = IdenEdgeQuery::get_v_filter_extend_content::<SimpleExpr>(now_id, vec![], db, None, None).await?;
            for cur_edge in more_data {
                IdenEdgeQuery::delete_from_id(db, cur_edge.id);
            }
            return Ok(());
        }
        now_id = val[0];
    }
    Ok(())
}

pub async fn create_iden_with_slice(iden_slice: Vec<&str>, node_ids: Vec<i64>, db: &DatabaseConnection) -> Result<()> {
    let mut now_id = DEFAULT_NODES.lock().unwrap().default_iden_node;
    let mut flag = false;
    use crate::db::entity::edge::iden::Column;
    for (i, iden_part) in iden_slice.iter().enumerate() {
        let val =  if flag {
            vec![]
        } else {
            IdenEdgeQuery::get_v_filter(now_id, Column::Iden.eq(*iden_part), db).await?
        };
        if ((i != iden_slice.len() - 1) && !val.is_empty()) {
            now_id = val[0];
        } else {
            // check step

            if i == iden_slice.len() - 1 {
                flag = true;
                for node_id in &node_ids {
                    IdenEdgeRaw {
                        u: now_id,
                        v: *node_id,
                        iden: iden_part.to_string(),
                        weight: 1,
                    }.save(db).await?;
                }
            } else {
                flag = true;
                let new_node = IdenNodeRaw {
                    public: IdenNodePublicRaw {
                        iden: iden_part.to_string(),
                        weight: 1,
                    },
                    private: IdenNodePrivateRaw {},
                }.save(db).await?;
                IdenEdgeRaw {
                    u: now_id,
                    v: new_node.node_id,
                    iden: iden_part.to_string(),
                    weight: 1,
                }.save(db).await?;
                now_id = new_node.node_id;
            }
        }
    }
    Ok(())
}


/*
* 分词规则：
* 如果整个iden中存在 # 那么强制以 # 分词
* 否则则按如下规则分词。
* 对连续的数字和字母分词。
* 出现/隔开，/不算分词。
* 英文词汇出现在词库中。
*/
pub fn auto_slice_iden(iden: &str) -> Vec<&str> {
    // check /
    for c in iden.chars() {
        if c == '#' {
            return iden.split('#').collect();
        }
    }
    let mut result = vec![];
    let mut last_v = 0;
    let mut now_p = 0;
    for (i, c) in iden.char_indices() {
        fn ck_group(a: char, b: char) -> bool {
            (a.is_ascii_alphabetic() && b.is_ascii_alphabetic()) ||
                (a.is_ascii_digit() && b.is_ascii_digit())
        }
        match c {
            '/' => {
                if i > last_v {
                    result.push(&iden[last_v..i]);
                }
                last_v = i + 1;
                now_p = 0;
            }

            '0'..='9' | 'a'..='z' | 'A'..='Z' => {
                if !ck_group(c, iden.chars().nth(last_v).unwrap()) { // new word.
                    if i > last_v {
                        result.push(&iden[last_v..i]);
                    }
                    last_v = i;
                    now_p = 0;
                } else {
                    let (_res, pp) = SLICE_WORD_ACMAC.lock().unwrap().query_from_p(iden.chars().nth(i).unwrap(), now_p);
                    if _res {
                        result.push(&iden[last_v..=i]);
                        last_v = i + 1;
                    }
                    now_p = pp;
                }
            }

            _ => {}
        }
    }
    if last_v < iden.len() {
        result.push(&iden[last_v..]);
    }
    log::debug!("auto slice iden: {} to {:?}", iden, result);
    result
}

pub async fn get_node_ids_from_iden(iden: &str, db: &DatabaseConnection, redis: &mut redis::Connection) -> Result<Vec<i64>> {
    if let Ok(value) = redis.get(format!("iden_to_id_{}", iden))
        && let Some(value) = value {
            let value: Vec<i64> = serde_json::from_str(&value)?;
            return Ok(value);

    }
    let iden_slice = auto_slice_iden(iden);
    let now_id = get_node_ids_from_iden_slice(iden_slice, db).await?;
    redis.set(format!("iden_to_id_{}", iden), serde_json::to_string(&now_id)?)?;
    log::debug!("auto iden: {} to {:?}", iden, now_id);
    Ok(now_id)
}

pub async fn get_node_ids_from_iden_slice(iden_slice: Vec<&str>, db: &DatabaseConnection) -> Result<Vec<i64>> {
    let mut now_id = DEFAULT_NODES.lock().unwrap().default_iden_node;
    let mut id_list = vec![];
    for iden_part in iden_slice {
        log::trace!("iden: {}", iden_part);
        let val = IdenEdgeQuery::get_v_filter(now_id, crate::db::entity::edge::iden::Column::Iden.eq(iden_part), db).await?;
        if val.is_empty() {
            return Err(crate::error::CoreError::NotFound("Cannot found specific iden.".to_string()));
        }
        now_id = val[0];
        id_list = val;
        log::debug!("part iden: {} now_id: {:?}", iden_part, now_id);
    }
    Ok(id_list)
}

pub async fn get_node_id_iden(node_id: i64, db: &DatabaseConnection, redis: &mut redis::Connection) -> Result<Vec<String>> {
    if let Ok(value) = redis.get(format!("iden_node_{}", node_id))
        && let Some(value) = value {
            let value: Vec<String> = serde_json::from_str(&value)?;
            return Ok(value);

    }
    let result = get_node_id_iden_pref(node_id, db, redis, "").await?;
    redis.set(format!("iden_node_{}", node_id), serde_json::to_string(&result)?)?;
    Ok(result)
}

pub async fn get_node_id_iden_pref(node_id: i64, db: &DatabaseConnection, redis: &mut redis::Connection, pref: &str) -> Result<Vec<String>> {
    if !pref.is_empty() && let Ok(value) = redis.get(format!("iden_node_{}_pref_{}", node_id, pref))
            && let Some(value) = value {
            let value: Vec<String> = serde_json::from_str(&value)?;
            return Ok(value);
    }
    let result = get_node_id_iden_all(node_id, db, pref).await?;
    let iden_list: Vec<String> = result.into_iter().map(|(_, iden)| iden).collect();
    if !pref.is_empty() {
        redis.set(format!("iden_node_{}_pref_{}", node_id, pref), serde_json::to_string(&iden_list)?)?;
    }
    Ok(iden_list)
}

/*
* 在给定的node_id下，匹配所有存在pref的iden。若 pref 为空字符串，则匹配所有。
* 本函数不应当直接从外部调用，应当通过 get_node_id_iden_pref 调用。
*/
async fn get_node_id_iden_all(node_id: i64, db: &DatabaseConnection, pref: &str) -> Result<Vec<(i64, String)>> {
    use priority_queue::PriorityQueue;
    let mut q = PriorityQueue::new();
    q.push((node_id, "".to_string(), pref.is_empty()), 0);
    let super_node = DEFAULT_NODES.lock().unwrap().default_iden_node;
    let mut result = vec![];
    while !q.is_empty() {
        let ((now_id, now_iden, allowed), weight) = q.pop().unwrap();
        if now_id == super_node {
            if allowed {
                result.push((weight, now_iden.to_string()));
            }
            continue;
        }
        let edges = IdenEdgeQuery::get_u_for_all(now_id, db).await?;
        for edge in edges {
            let new_iden = if now_iden.is_empty() {
                edge.iden.clone()
            } else {
                format!("{}{}", edge.iden, now_iden)
            };
            let flag = allowed || new_iden.starts_with(pref);
            q.push((edge.u, new_iden, flag), weight + edge.weight);
        }
    }
    result.sort_by(|a, b| {
        if a.0 != b.0 {
            b.0.cmp(&a.0)
        } else {
            a.1.cmp(&b.1)
        }
    });
    Ok(result)
}

pub fn create_words(words: Vec<&str>) {
    *SLICE_WORD_LIST.lock().unwrap() = words.into_iter().map(|w| w.to_string()).collect();
}