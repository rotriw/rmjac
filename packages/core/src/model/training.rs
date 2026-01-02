use std::cmp::max;
use std::collections::HashMap;
use async_recursion::async_recursion;
use chrono::NaiveDateTime;
use redis::TypedCommands;
use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};
use crate::graph::edge::{Edge, EdgeQuery, EdgeQueryOrder, EdgeRaw};
use crate::graph::edge::training_problem::{TrainingProblemEdge, TrainingProblemEdgeQuery, TrainingProblemEdgeRaw, TrainingProblemType};
use crate::graph::edge::perm_pages::{PermPagesEdgeRaw, PagesPerm};
use crate::graph::node::{Node, NodeRaw};
use crate::Result;
use crate::db::entity::node::user::get_user_by_iden;
use crate::error::{CoreError, QueryNotFound};
use crate::graph::action::get_node_type;
use crate::graph::node::record::RecordStatus;
use crate::graph::node::training::{TrainingNode, TrainingNodePrivateRaw, TrainingNodePublicRaw, TrainingNodeRaw};
use crate::graph::node::training::problem::{TrainingProblemNode, TrainingProblemNodePrivateRaw, TrainingProblemNodePublicRaw, TrainingProblemNodeRaw};
use crate::model::problem::{get_problem, get_problem_iden, get_problem_node_and_statement};
use crate::service::iden::{create_iden, get_node_id_iden, get_node_ids_from_iden};
use crate::utils::get_redis_connection;

#[allow(unused)]
#[allow(clippy::too_many_arguments)]
pub async fn create_training(
    db: &DatabaseConnection,
    redis: &mut redis::Connection,
    title: &str,
    user_iden: &str,
    pb_iden: &str,
    description_public: &str,
    description_private: &str,
    start_time: NaiveDateTime,
    end_time: NaiveDateTime,
    training_type: &str,
    problem_list: &TrainingList,
    write_perm_user: Vec<i64>,
    read_perm_user: Vec<i64>,
) -> Result<TrainingNode> {
    let node = TrainingNodeRaw {
        public: TrainingNodePublicRaw {
            name: title.to_string(),
            iden: pb_iden.to_string(),
            description: description_public.to_string(),
            start_time,
            end_time,
            training_type: training_type.to_string(),
        },
        private: TrainingNodePrivateRaw {
            description: description_private.to_string(),
        }
    }.save(db).await?;
    let create_problem = create_training_problem_node(db, problem_list, redis).await;
    if let Ok(create_problem) = create_problem {
        TrainingProblemEdgeRaw {
            u: node.node_id,
            v: create_problem.node_id,
            order: 0,
            problem_type: TrainingProblemType::Default
        }.save(db).await?;
    }
    // create node iden
    create_iden(db, redis, format!("training#{user_iden}#{pb_iden}").as_str(), vec![node.node_id]).await?;

    // 为创建者授予训练权限
    log::info!("Granting training creator permissions for user {}", user_iden);
    if let Ok(user_node_ids) = get_node_ids_from_iden(db, redis, user_iden).await
        && let Some(creator_node_id) = user_node_ids.first() {
        grant_training_creator_permissions(db, *creator_node_id, node.node_id).await?;
    }

    Ok(node)
}

#[derive(Debug, Clone, PartialEq, Deserialize, Serialize)]
pub struct TrainingList {
    pub node_id: Option<i64>,
    pub description: String,
    pub own_problem: Vec<TrainingProblem>,
}

#[derive(Debug, Clone, PartialEq, Deserialize, Serialize)]
pub enum TrainingProblem {
    ProblemIden((i64, String)), // edge_id, problem_iden
    ProblemTraining(TrainingList),
    ProblemPresetTraining((i64, String)),
    ExistTraining((i64, String)),
}

#[async_recursion(?Send)]
pub async fn create_training_problem_node(db: &DatabaseConnection, problem: &TrainingList, redis: &mut redis::Connection) -> Result<TrainingProblemNode> {
    let now_training = TrainingProblemNodeRaw {
        public: TrainingProblemNodePublicRaw {
            description: problem.description.to_string(),
        },
        private: TrainingProblemNodePrivateRaw {}
    }.save(db).await?;
    for (now_order, id) in problem.own_problem.iter().enumerate() {
        match id {
            TrainingProblem::ProblemTraining(sub_training) => {
                let sub_node = create_training_problem_node(db, sub_training, redis).await;
                if let Ok(sub_node) = sub_node {
                    TrainingProblemEdgeRaw {
                        u: now_training.node_id,
                        v: sub_node.node_id,
                        order: now_order as i64,
                        problem_type: TrainingProblemType::Default
                    }.save(db).await?;
                }
            }
            TrainingProblem::ProblemIden((_edge_id, iden)) => {
                let problem = get_problem(db, redis, iden).await;
                if let Ok(problem) = problem {
                    TrainingProblemEdgeRaw {
                        u: now_training.node_id,
                        v: problem.1,
                        order: now_order as i64,
                        problem_type: TrainingProblemType::Default
                    }.save(db).await?;
                }
            }
            _ => {}
        }
    }
    Ok(now_training)
}


pub async fn create_training_problem_node_for_list(db: &DatabaseConnection, redis: &mut redis::Connection, problem_list: &TrainingList, list_id: i64) -> Result<TrainingProblemNode> {
    let training_problem_node = create_training_problem_node(db, problem_list, redis).await?;
    let problem_list = get_training_problem_list_one_with_order(db, redis, list_id).await?;
    let mut max_order = 0;
    for (_, order) in &problem_list {
        max_order = max(max_order, *order);
    }
    let _training_problem_edge = TrainingProblemEdgeRaw {
        u: list_id,
        v: training_problem_node.node_id,
        order: max_order as i64 + 1,
        problem_type: TrainingProblemType::Default
    }.save(db).await?;
    Ok(training_problem_node)
}


#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Training {
    pub training_node: TrainingNode,
    pub problem_list: TrainingList,
}

#[async_recursion]
pub async fn get_training_problem_list(db: &DatabaseConnection, redis: &mut redis::Connection, node_id: i64) -> Result<TrainingList> {
    let training_problem_node = TrainingProblemNode::from_db(db, node_id).await?;
    let mut result = TrainingList {
        node_id: Some(node_id),
        description: training_problem_node.public.description.clone(),
        own_problem: vec![],
    };
    let edges = TrainingProblemEdgeQuery::get_order_asc_extend(node_id, db).await?;
    for edge in edges {
        let next_node_id = edge.v;
        match edge.problem_type {
            TrainingProblemType::Default => {
                let node_type = get_node_type(db, next_node_id).await?;
                if node_type == "problem" || node_type == "problem_statement" {
                    let problem_iden = get_problem_iden(db, redis, next_node_id).await?;
                    result.own_problem.push(TrainingProblem::ProblemIden((edge.id, problem_iden)));
                } else {
                    let sub_problem = get_training_problem_list(db, redis, next_node_id).await?;
                    result.own_problem.push(TrainingProblem::ProblemTraining(sub_problem));
                }
            }
            TrainingProblemType::Preset => {
                let problem_iden = if let Ok(iden_value) = get_node_id_iden(db, redis, next_node_id).await {
                    iden_value[0].clone()
                } else {
                    "unknown".to_string()
                };
                result.own_problem.push(TrainingProblem::ExistTraining((next_node_id, problem_iden)));
            }
            TrainingProblemType::OnlyPreview => {
                let problem_iden = if let Ok(iden_value) = get_node_id_iden(db, redis, next_node_id).await {
                    iden_value[0].clone()
                } else {
                    "unknown".to_string()
                };
                result.own_problem.push(TrainingProblem::ExistTraining((next_node_id, problem_iden)));
            }
            TrainingProblemType::PresetForce => {
                let _problem_iden = if let Ok(iden_value) = get_node_id_iden(db, redis, next_node_id).await {
                    iden_value[0].clone()
                } else {
                    "unknown".to_string()
                };
                let _problem_iden = get_node_id_iden(db, redis, next_node_id).await?[0].clone();
            }
        }
    }
    Ok(result)
}

// 获得当前点的列表。
// (node_id, order)
pub async fn get_training_problem_list_one_with_order(db: &DatabaseConnection, _redis: &mut redis::Connection, node_id: i64) -> Result<Vec<(i64, i64)>> {
    let _training_problem_node = TrainingProblemNode::from_db(db, node_id).await?;
    let mut result = vec![];
    let edges = TrainingProblemEdgeQuery::get_order_asc_extend(node_id, db).await?;
    for edge in edges {
        result.push((edge.v, edge.order));
    }
    Ok(result)
}

pub async fn get_training_problem_list_edges_with_order(db: &DatabaseConnection, _redis: &mut redis::Connection, node_id: i64) -> Result<Vec<TrainingProblemEdge>> {
    let _training_problem_node = TrainingProblemNode::from_db(db, node_id).await?;
    TrainingProblemEdgeQuery::get_order_asc_extend(node_id, db).await
}

pub async fn get_training_node_id_by_iden(db: &DatabaseConnection, redis: &mut redis::Connection, user_iden: &str, pb_iden: &str) -> Result<i64> {
    let user_id = get_user_by_iden(db, user_iden).await?.node_id.to_string();
    Ok(get_node_ids_from_iden(db, redis, format!("training#{user_id}#{pb_iden}").as_str()).await?[0])
}

pub async fn get_training(db: &DatabaseConnection, redis: &mut redis::Connection, node_id: i64) -> Result<Training> {
    // log::info!("Fetching training with node ID: {}", node_id);
    let training_node = TrainingNode::from_db(db, node_id).await?;
    // log::info!("Training node ID: {}", training_node.node_id);
    let training_problem_node_id = {
        let edges = TrainingProblemEdgeQuery::get_order_asc_extend(training_node.node_id, db).await?;
        if edges.is_empty() {
            return Err(CoreError::NotFound("No problem list found for this training".to_string()));
        }
        edges[0].v
    };
    let problem_list = get_training_problem_list(db, redis, training_problem_node_id).await?;
    let result = Training {
        training_node,
        problem_list,
    };
    let _ = redis.set::<_, _>(format!("training_{node_id}"), serde_json::to_string(&result)?);
    Ok(result)
}


pub async fn get_training_problem_id(db: &DatabaseConnection, redis: &mut redis::Connection, node_id: i64) -> Result<i64> {
    let edges = TrainingProblemEdgeQuery::get_order_asc_extend(node_id, db).await?;
    if edges.is_empty() {
        return Err(CoreError::NotFound("No problem list found for this training".to_string()));
    }
    Ok(edges[0].v)
}

pub async fn add_problem_into_training_list(db: &DatabaseConnection, redis: &mut redis::Connection, node_id: i64, problem_node_id: i64) -> Result<Vec<(i64, i64)>> {
    let mut problem_list = get_training_problem_list_one_with_order(db, redis, node_id).await?;
    let _problem_iden = get_node_id_iden(db, redis, problem_node_id).await?[0].clone();
    let mut new_order_id = 0;
    for (_, order) in &problem_list {
        new_order_id = max(new_order_id, *order);
    }
    TrainingProblemEdgeRaw {
        u: node_id,
        v: problem_node_id,
        order: new_order_id + 1,
        problem_type: TrainingProblemType::Default
    }.save(db).await?;
    problem_list.push((problem_node_id, new_order_id + 1));
    Ok(problem_list)
}

pub async fn add_preset_into_training_list(db: &DatabaseConnection, redis: &mut redis::Connection, node_id: i64, preset_id: i64) -> Result<Vec<(i64, i64)>> {
    let preset_problem_list = get_training_problem_list_one_with_order(db, redis, preset_id).await?;
    let mut problem_list = get_training_problem_list_one_with_order(db, redis, node_id).await?;
    let mut new_order_id = 0;
    for (_, order) in &problem_list {
        new_order_id = max(new_order_id, *order);
    }
    for (problem_node_id, _) in preset_problem_list {
        new_order_id += 1;
        TrainingProblemEdgeRaw {
            u: node_id,
            v: problem_node_id,
            order: new_order_id,
            problem_type: TrainingProblemType::Preset
        }.save(db).await?;
        problem_list.push((problem_node_id, new_order_id));
    }
    Ok(problem_list)
}

#[async_recursion]
pub async fn get_training_list_root(db: &DatabaseConnection, redis: &mut redis::Connection, node_id: i64) -> Result<i64> {
    let node_type = get_node_type(db, node_id).await?;
    if node_type != "training_problem" {
        return Ok(node_id);
    }
    let edges = TrainingProblemEdgeQuery::get_order_asc_extend(node_id, db).await?;
    for edge in edges {
        let parent_node_id = edge.u;
        if edge.problem_type == TrainingProblemType::Default {
            return Ok(get_training_list_root(db, redis, parent_node_id).await?);
        }
    }
    Ok(node_id)
}

pub async fn add_exist_list_for_training_list(db: &DatabaseConnection, redis: &mut redis::Connection, node_id: i64, exist_list: i64) -> Result<Vec<(i64, i64)>> {
    let mut problem_list = get_training_problem_list_one_with_order(db, redis, node_id).await?;
    let _root_problem_list = get_training_list_root(db, redis, node_id).await?;
    let mut new_order_id = 0;
    for (_, order) in &problem_list {
        new_order_id = max(new_order_id, *order);
    }
    new_order_id += 1;
    TrainingProblemEdgeRaw {
        u: node_id,
        v: exist_list,
        order: new_order_id,
        problem_type: TrainingProblemType::OnlyPreview
    }.save(db).await?;
    problem_list.push((exist_list, new_order_id));
    Ok(problem_list)
}

/*
将一道题目加入到一个训练中，返回更新后的训练题单
node_id: 训练的节点编号, problem_iden: 题目标识
*/
pub async fn add_problem_into_training_list_from_problem_iden(db: &DatabaseConnection, redis: &mut redis::Connection, node_id: i64, problem_iden: &String) -> Result<Vec<(i64, i64)>> {
    let (problem_node_id, statement_node_id) = get_problem_node_and_statement(db, redis, problem_iden).await?;
    add_problem_into_training_list(db, redis, node_id, if statement_node_id != -1 {
        statement_node_id
    } else {
        problem_node_id
    }).await
}

pub async fn update_training_problem_order(db: &DatabaseConnection, _redis: &mut redis::Connection, training_list_id: i64, orders: Vec<(i64, i64)>) -> Result<()> {
    use sea_orm::entity::prelude::*;
    for (id, order) in orders {
        let edge = TrainingProblemEdgeQuery::get_v_one_filter_extend(training_list_id, crate::db::entity::edge::training_problem::Column::VNodeId.eq(id), db).await;
        if let Ok(edge) = edge {
            edge.modify(db, crate::db::entity::edge::training_problem::Column::Order, order).await?;
            continue;
        }
        let edge = TrainingProblemEdge::from_db(db, id).await;
        if let Ok(edge) = edge && edge.u == training_list_id {
            edge.modify(db, crate::db::entity::edge::training_problem::Column::Order, order).await?;
        }
    }
    Ok(())
}

/// Delete all connections for a training (edges only)
/// This function removes all training-problem edges while keeping the training node intact
pub async fn delete_training_connections(
    db: &DatabaseConnection,
    redis: &mut redis::Connection,
    user_iden: &str,
    training_iden: &str,
) -> Result<()> {
    log::info!("Starting to delete connections for training: {}#{}", user_iden, training_iden);

    // Get training node ID from iden
    let iden = format!("training#{user_iden}#{training_iden}");
    let node_ids = get_node_ids_from_iden(db, redis, &iden).await?;
    if node_ids.is_empty() {
        return Err(CoreError::NotFound("Cannot find training with this iden".to_string()));
    }

    let training_node_id = node_ids[0];
    log::debug!("Found training node ID: {}", training_node_id);

    // Get all problem nodes connected to this training using EdgeQuery
    let problem_node_ids = TrainingProblemEdgeQuery::get_v(training_node_id, db).await?;
    log::debug!("Found {} problem nodes in training", problem_node_ids.len());

    // Delete all training-problem edges using EdgeQuery
    for problem_node_id in problem_node_ids {
        TrainingProblemEdgeQuery::delete(db, training_node_id, problem_node_id).await?;
        log::debug!("Deleted training-problem edge: {} -> {}", training_node_id, problem_node_id);
    }

    // Clear training cache
    let _ = redis.del::<_>(format!("training_{training_node_id}"));

    log::info!("Successfully deleted all connections for training: {}#{}", user_iden, training_iden);
    Ok(())
}

/// Remove a problem from a training (delete edge only)
pub async fn remove_all_problem_from_training(
    db: &DatabaseConnection,
    redis: &mut redis::Connection,
    user_iden: &str,
    training_iden: &str,
    problem_iden: &str,
) -> Result<()> {
    log::info!("Removing problem {} from training {}#{}", problem_iden, user_iden, training_iden);

    // Get training node ID from iden
    let training_iden_full = format!("training#{user_iden}#{training_iden}");
    let training_node_ids = get_node_ids_from_iden(db, redis, &training_iden_full).await?;
    if training_node_ids.is_empty() {
        return Err(CoreError::NotFound("Cannot find training with this iden".to_string()));
    }
    let training_node_id = training_node_ids[0];

    // Get problem node ID from problem_iden
    let problem_node_ids = get_node_ids_from_iden(db, redis, problem_iden).await?;
    if problem_node_ids.is_empty() {
        return Err(CoreError::NotFound("Cannot find problem with this iden".to_string()));
    }

    // Find the problem node (not statement node) from the returned nodes
    let mut problem_node_id = -1;
    for &node_id in &problem_node_ids {
        if let Ok(node_type) = get_node_type(db, node_id).await
            && node_type == "problem" {
                problem_node_id = node_id;
                break;
            }
    }

    // If no problem node found, use the first node ID
    if problem_node_id == -1 {
        problem_node_id = problem_node_ids[0];
    }

    // Delete the training-problem edge using EdgeQuery
    TrainingProblemEdgeQuery::delete(db, training_node_id, problem_node_id).await?;

    // Clear training cache
    let _ = redis.del::<_>(format!("training_{training_node_id}"));

    log::info!("Successfully removed problem {} from training {}#{}", problem_iden, user_iden, training_iden);
    Ok(())
}

pub async fn remove_problem_from_training_by_node_id(
    db: &DatabaseConnection,
    redis: &mut redis::Connection,
    training_node_id: i64,
    problem_node_id: i64,
) -> Result<()> {
    log::info!("Removing problem {} from training {}", problem_node_id, training_node_id);

    // Delete the training-problem edge using EdgeQuery
    TrainingProblemEdgeQuery::delete(db, training_node_id, problem_node_id).await?;

    // Clear training cache
    let _ = redis.del::<_>(format!("training_{training_node_id}"));

    log::info!("Successfully removed problem {} from training {}", problem_node_id, training_node_id);
    Ok(())
}


pub async fn modify_training_description(
    db: &DatabaseConnection,
    training_node_id: i64,
    new_description_public: &str,
    new_description_private: &str,
) -> Result<TrainingNode> {
    log::info!("Updating training {} descriptions", training_node_id);

    let training_node = TrainingNode::from_db(db, training_node_id).await?;

    use crate::db::entity::node::training::Column::{DescriptionPublic, DescriptionPrivate};
    let updated_training = training_node
        .modify(db, DescriptionPublic, new_description_public.to_string())
        .await?
        .modify(db, DescriptionPrivate, new_description_private.to_string())
        .await?;

    log::info!("Successfully updated training {} descriptions", training_node_id);
    Ok(updated_training)
}

/// 为训练创建者授予必要的权限
pub async fn grant_training_creator_permissions(
    db: &DatabaseConnection,
    user_node_id: i64,
    training_node_id: i64,
) -> Result<()> {
    log::info!("Granting training creator permissions: user {} -> training {}", user_node_id, training_node_id);

    // 授予页面权限（包含查看和管理）
    PermPagesEdgeRaw {
        u: user_node_id,
        v: training_node_id,
        perms: crate::graph::edge::perm_pages::PagesPermRaw::Perms(vec![
            PagesPerm::ReadPages,
            PagesPerm::EditPages,
            PagesPerm::DeletePages,
            PagesPerm::ManagePagesPermissions,
            PagesPerm::PublishPages,
        ]),
    }
    .save(db)
    .await?;

    log::info!("Successfully granted training creator permissions: user {} -> training {}", user_node_id, training_node_id);
    Ok(())
}


/// 从token创建训练
#[allow(clippy::too_many_arguments)]
pub async fn create_training_with_user(
    db: &DatabaseConnection,
    redis: &mut redis::Connection,
    title: &str,
    user_iden: &str,
    pb_iden: &str,
    description_public: &str,
    description_private: &str,
    start_time: NaiveDateTime,
    end_time: NaiveDateTime,
    training_type: &str,
    problem_list: &TrainingList,
    write_perm_user: Vec<i64>,
    read_perm_user: Vec<i64>,
    user_node_id: i64,
) -> Result<TrainingNode> {
    log::info!("Creating new training with token, title:{}", title);

    let training_node = create_training(
        db,
        redis,
        title,
        user_iden,
        pb_iden,
        description_public,
        description_private,
        start_time,
        end_time,
        training_type,
        problem_list,
        write_perm_user,
        read_perm_user,
    ).await?;
    grant_training_creator_permissions(db, user_node_id, training_node.node_id).await?;
    Ok(training_node)
}

/// 为用户授予训练访问权限
pub async fn grant_training_access(
    db: &DatabaseConnection,
    user_node_id: i64,
    training_node_id: i64,
) -> Result<()> {
    log::info!("Granting training access: user {} -> training {}", user_node_id, training_node_id);

    // 授予页面权限（读取权限）
    PermPagesEdgeRaw {
        u: user_node_id,
        v: training_node_id,
        perms: crate::graph::edge::perm_pages::PagesPermRaw::Perms(vec![
            PagesPerm::ReadPages,
        ]),
    }
    .save(db)
    .await?;

    log::info!("Successfully granted training access: user {} -> training {}", user_node_id, training_node_id);
    Ok(())
}

#[async_recursion]
pub async fn check_problem_list_in_training(
    db: &DatabaseConnection,
    now_node_id: i64,
    list_node_id: i64,
) -> Result<bool> {
    if now_node_id == list_node_id {
        return Ok(true);
    }
    let problem_list = get_training_problem_list_one_with_order(db, &mut get_redis_connection(), now_node_id).await?;
    for (node_id, _) in problem_list {
        if node_id == list_node_id {
            return Ok(true);
        } else {
            let node_type = get_node_type(db, node_id).await?;
            if node_type == "training_problem" {
                if check_problem_list_in_training(db, node_id, list_node_id).await? {
                    return Ok(true);
                }
            }
        }
    }
    Ok(false)
}

#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
pub struct TrainingListStatus {
    pub total_task: i64,
    pub completed_task: i64,
    pub tried_task: i64,
    pub total_score: f64,
    pub data: HashMap<i64, String>,
}

#[async_recursion]
pub async fn get_user_training_status(
    db: &DatabaseConnection,
    redis: &mut redis::Connection,
    user_node_id: i64,
    training_node_id: i64,
) -> Result<TrainingListStatus> {
    let _cur_task = 0;
    // get from redis_list.
    let value = redis.exists(format!("user_training_vis_{user_node_id}_{training_node_id}"))?;
    if value {
        // this training has been visited.
        return Err(CoreError::Guard("Guard against repeated calls".to_string()));
    }
    let mut result = TrainingListStatus {
        total_task: 0,
        completed_task: 0,
        tried_task: 0,
        total_score: 0.0,
        data: HashMap::new(),
    };
    let _ = redis.set(format!("user_training_vis_{user_node_id}_{training_node_id}"), value);
    let problem_list = TrainingProblemEdgeQuery::get_order_asc_extend(training_node_id, db).await?;
    for edge in problem_list {
        let node_type = get_node_type(db, edge.v).await?;
        if node_type == "problem" || node_type == "problem_statement" {
            // get user problem status.
            let problem_status = crate::model::record::get_problem_user_status(db, user_node_id, edge.v).await;
            if let Ok(problem_status) = problem_status {
                result.total_task += 1;
                match problem_status {
                    RecordStatus::Accepted => {
                        result.completed_task += 1;
                    }
                    RecordStatus::WrongAnswer => {
                        result.tried_task += 1;
                    }
                    _ => {}
                }
                result.data.insert(edge.v, problem_status.to_string());
            }
        } else if node_type == "training_problem" {
            let sub_status = get_user_training_status(db, redis, user_node_id, edge.v).await;
            if let Ok(sub_status) = sub_status {
                result.total_task += sub_status.total_task;
                result.completed_task += sub_status.completed_task;
                result.tried_task += sub_status.tried_task;
                result.total_score += sub_status.total_score;
                let problem_status = if sub_status.completed_task == sub_status.total_task && sub_status.total_task > 0 {
                    RecordStatus::Accepted
                } else if sub_status.tried_task > 0 {
                    RecordStatus::WrongAnswer
                } else {
                    RecordStatus::NotFound
                };
                result.data.insert(edge.v, problem_status.to_string());
            }
        }
    }
    redis.del(format!("user_training_vis_{user_node_id}_{training_node_id}"))?;
    Ok(result)
}