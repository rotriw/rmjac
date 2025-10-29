use sea_orm::ColumnTrait;
use async_recursion::async_recursion;
use chrono::NaiveDateTime;
use redis::Commands;
use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};
use crate::graph::edge::{EdgeQuery, EdgeQueryOrder, EdgeRaw};
use crate::graph::edge::iden::IdenEdgeQuery;
use crate::graph::edge::training_problem::{TrainingProblemEdgeQuery, TrainingProblemEdgeRaw};
use crate::graph::edge::perm_view::{PermViewEdgeRaw, ViewPerm};
use crate::graph::edge::perm_manage::{PermManageEdgeRaw, ManagePerm};
use enum_const::EnumConst;
use crate::graph::node::{Node, NodeRaw};
use crate::{db, Result};
use crate::error::{CoreError, QueryExists};
use crate::graph::action::get_node_type;
use crate::graph::node::training::{TrainingNode, TrainingNodePrivateRaw, TrainingNodePublicRaw, TrainingNodeRaw};
use crate::graph::node::training::problem::{TrainingProblemNode, TrainingProblemNodePrivateRaw, TrainingProblemNodePublicRaw, TrainingProblemNodeRaw};
use crate::model::problem::get_problem;
use crate::service::iden::{create_iden, get_node_id_iden, get_node_ids_from_iden};

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
    let create_problem = create_training_problem_node(problem_list, db, redis).await;
    if let Ok(create_problem) = create_problem {
        TrainingProblemEdgeRaw {
            u: node.node_id,
            v: create_problem.node_id,
            order: 0,
        }.save(db).await?;
    }
    // create node iden
    create_iden(format!("training#{user_iden}#{pb_iden}").as_str(), vec![node.node_id], db).await?;

    // 为创建者授予训练权限
    log::info!("Granting training creator permissions for user {}", user_iden);
    if let Ok(user_node_ids) = get_node_ids_from_iden(user_iden, db, redis).await
        && let Some(creator_node_id) = user_node_ids.first() {
        grant_training_creator_permissions(db, *creator_node_id, node.node_id).await?;
    }

    Ok(node)
}

#[derive(Debug, Clone, PartialEq, Deserialize, Serialize)]
pub struct TrainingList {
    pub description: String,
    pub own_problem: Vec<TrainingProblem>,
}

#[derive(Debug, Clone, PartialEq, Deserialize, Serialize)]
pub enum TrainingProblem {
    ProblemIden(String),
    ProblemTraining(TrainingList)
}

#[async_recursion(?Send)]
pub async fn create_training_problem_node(problem: &TrainingList, db: &DatabaseConnection, redis: &mut redis::Connection) -> Result<TrainingProblemNode> {
    let now_training = TrainingProblemNodeRaw {
        public: TrainingProblemNodePublicRaw {
            description: problem.description.to_string(),
        },
        private: TrainingProblemNodePrivateRaw {}
    }.save(db).await?;
    for (now_order, id) in problem.own_problem.iter().enumerate() {
        match id {
            TrainingProblem::ProblemTraining(sub_training) => {
                let sub_node = create_training_problem_node(sub_training, db, redis).await;
                if let Ok(sub_node) = sub_node {
                    TrainingProblemEdgeRaw {
                        u: now_training.node_id,
                        v: sub_node.node_id,
                        order: now_order as i64,
                    }.save(db).await?;
                }
            }
            TrainingProblem::ProblemIden(iden) => {
                let problem = get_problem(db, redis, iden).await;
                if let Ok(problem) = problem {
                    TrainingProblemEdgeRaw {
                        u: now_training.node_id,
                        v: problem.1,
                        order: now_order as i64,
                    }.save(db).await?;
                }
            }
        }
    }
    Ok(now_training)
}

pub async fn get_training_node_id_by_iden(db: &DatabaseConnection, _redis: &mut redis::Connection, iden: &str, now_id: i64, pathd: &str) -> Result<i64> {
    if iden.is_empty() {
        return Ok(now_id);
    }
    use db::entity::edge::iden::Column as IdenColumn;
    let edges = IdenEdgeQuery::get_v_filter(now_id, IdenColumn::Iden.eq(now_id), db).await?;
    if !edges.is_empty() {
        return Err(CoreError::NotFound(format!("{pathd} not found.")));
    }
    Ok(edges[0])
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
        description: training_problem_node.public.description.clone(),
        own_problem: vec![],
    };
    let node_ids = TrainingProblemEdgeQuery::get_order_asc(node_id, db).await?;
    for next_node_id in node_ids {
        let node_type = get_node_type(db, next_node_id).await?;
        if node_type == "problem" || node_type == "problem_statement" {
            let problem_iden = get_node_id_iden(node_id, db, redis).await?[0].clone();
            result.own_problem.push(TrainingProblem::ProblemIden(problem_iden));
        } else {
            let sub_problem = get_training_problem_list(db, redis, next_node_id).await?;
            result.own_problem.push(TrainingProblem::ProblemTraining(sub_problem));
        }
    }
    Ok(result)
}

pub async fn get_training(db: &DatabaseConnection, redis: &mut redis::Connection, user_iden: &str, pb_iden: &str) -> Result<Training> {
    let iden_id = get_node_ids_from_iden(format!("training#{user_iden}#{pb_iden}").as_str(), db, redis).await?[0];
    let training_node = TrainingNode::from_db(db, iden_id).await?;
    let problem_list = get_training_problem_list(db, redis, training_node.node_id).await?;
    let result = Training {
        training_node,
        problem_list,
    };
    let _ = redis.set::<_, _, ()>(format!("training_{iden_id}"), serde_json::to_string(&result).unwrap());
    Ok(result)
}

/*
将一道题目加入到一个训练中，返回更新后的训练题单
node_id: 训练的节点编号, problem_iden: 题目标识
*/
pub async fn add_problem_into_training_list(db: &DatabaseConnection, redis: &mut redis::Connection, node_id: i64, problem_iden: &String) -> Result<TrainingList> {
    let mut problem_list = get_training_problem_list(db, redis, node_id).await?;
    let problem = get_problem(db, redis, problem_iden).await?;
    for p in &problem_list.own_problem {
        if let TrainingProblem::ProblemIden(iden) = p
            && iden == problem_iden {
                return Err(CoreError::QueryExists(QueryExists::ProblemExist));
            }
    }
    TrainingProblemEdgeRaw {
        u: node_id,
        v: problem.1,
        order: problem_list.own_problem.len() as i64,
    }.save(db).await?;
    problem_list.own_problem.push(TrainingProblem::ProblemIden(problem_iden.to_string()));
    Ok(problem_list)
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
    let node_ids = get_node_ids_from_iden(&iden, db, redis).await?;
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
    let _ = redis.del::<_, ()>(format!("training_{training_node_id}"));

    log::info!("Successfully deleted all connections for training: {}#{}", user_iden, training_iden);
    Ok(())
}

/// Remove a problem from a training (delete edge only)
pub async fn remove_problem_from_training(
    db: &DatabaseConnection,
    redis: &mut redis::Connection,
    user_iden: &str,
    training_iden: &str,
    problem_iden: &str,
) -> Result<()> {
    log::info!("Removing problem {} from training {}#{}", problem_iden, user_iden, training_iden);

    // Get training node ID from iden
    let training_iden_full = format!("training#{user_iden}#{training_iden}");
    let training_node_ids = get_node_ids_from_iden(&training_iden_full, db, redis).await?;
    if training_node_ids.is_empty() {
        return Err(CoreError::NotFound("Cannot find training with this iden".to_string()));
    }
    let training_node_id = training_node_ids[0];

    // Get problem node ID from problem_iden
    let problem_node_ids = get_node_ids_from_iden(problem_iden, db, redis).await?;
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
    let _ = redis.del::<_, ()>(format!("training_{training_node_id}"));

    log::info!("Successfully removed problem {} from training {}#{}", problem_iden, user_iden, training_iden);
    Ok(())
}

/// Remove a problem from training list by node ID (delete edge only)
/// This is a more efficient version that works directly with node IDs
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
    let _ = redis.del::<_, ()>(format!("training_{training_node_id}"));

    log::info!("Successfully removed problem {} from training {}", problem_node_id, training_node_id);
    Ok(())
}

/// 为训练创建者授予必要的权限
pub async fn grant_training_creator_permissions(
    db: &DatabaseConnection,
    user_node_id: i64,
    training_node_id: i64,
) -> Result<()> {
    log::info!("Granting training creator permissions: user {} -> training {}", user_node_id, training_node_id);

    // 授予查看权限
    PermViewEdgeRaw {
        u: user_node_id,
        v: training_node_id,
        perms: crate::graph::edge::perm_view::ViewPermRaw::Perms(vec![
            ViewPerm::ViewPublic,
        ]),
    }
    .save(db)
    .await?;

    // 授予管理权限
    PermManageEdgeRaw {
        u: user_node_id,
        v: training_node_id,
        perms: crate::graph::edge::perm_manage::ManagePermRaw::Perms(vec![
            ManagePerm::ManagePublicDescription,
            ManagePerm::ManagePrivateDescription,
            ManagePerm::ManageEdge,  // 可以添加/删除题目
        ]),
    }
    .save(db)
    .await?;

    log::info!("Successfully granted training creator permissions: user {} -> training {}", user_node_id, training_node_id);
    Ok(())
}

/// 带认证上下文的训练创建函数
pub async fn create_training_with_auth(
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
    auth_context: Option<&crate::auth::context::AuthContext>,
) -> Result<TrainingNode> {
    log::info!("Creating new training with auth context, title:{}", title);

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

    // 如果有认证上下文，为创建者授予权限
    if let Some(ctx) = auth_context {
        log::info!("Granting training creator permissions for user {}", ctx.user_iden);
        grant_training_creator_permissions(db, ctx.user_node_id, training_node.node_id).await?;
    }

    Ok(training_node)
}

/// 从token创建训练
pub async fn create_training_with_token(
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
    token: &str,
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

    // 尝试从token获取用户并授予权限
    let user_node_id = match crate::service::iden::get_node_ids_from_iden(user_iden, db, redis).await {
        Ok(ids) => ids.first().copied(),
        Err(_) => {
            // 尝试从token获取
            match crate::auth::context::AuthManager::authenticate_user(db, redis, token).await {
                Ok(Some(ctx)) => Some(ctx.user_node_id),
                _ => None,
            }
        }
    };

    if let Some(user_node_id) = user_node_id {
        log::info!("Granting training creator permissions for user from token");
        grant_training_creator_permissions(db, user_node_id, training_node.node_id).await?;
    } else {
        log::warn!("Could not authenticate user, no permissions granted");
    }

    Ok(training_node)
}

/// 为用户授予训练访问权限
pub async fn grant_training_access(
    db: &DatabaseConnection,
    user_node_id: i64,
    training_node_id: i64,
) -> Result<()> {
    log::info!("Granting training access: user {} -> training {}", user_node_id, training_node_id);

    // 授予查看权限
    PermViewEdgeRaw {
        u: user_node_id,
        v: training_node_id,
        perms: crate::graph::edge::perm_view::ViewPermRaw::Perms(vec![
            ViewPerm::ViewPublic,
        ]),
    }
    .save(db)
    .await?;

    log::info!("Successfully granted training access: user {} -> training {}", user_node_id, training_node_id);
    Ok(())
}

/// 检查用户是否有训练权限
pub async fn check_training_permission(
    db: &DatabaseConnection,
    user_node_id: i64,
    training_node_id: i64,
    required_view_perm: ViewPerm,
) -> Result<bool> {
    use crate::model::perm::check_perm;

    match check_perm(
        db,
        user_node_id,
        training_node_id,
        crate::graph::edge::perm_view::PermViewEdgeQuery,
        required_view_perm.get_const_isize().unwrap() as i64,
    ).await? {
        1 => Ok(true),
        _ => Ok(false),
    }
}

/// 检查用户是否有训练管理权限
pub async fn check_training_manage_permission(
    db: &DatabaseConnection,
    user_node_id: i64,
    training_node_id: i64,
    required_manage_perm: ManagePerm,
) -> Result<bool> {
    use crate::model::perm::check_perm;

    match check_perm(
        db,
        user_node_id,
        training_node_id,
        crate::graph::edge::perm_manage::PermManageEdgeQuery,
        required_manage_perm.get_const_isize().unwrap() as i64,
    ).await? {
        1 => Ok(true),
        _ => Ok(false),
    }
}
// pub async fn remove_problem_from_training_list(db: &DatabaseConnection, redis: &mut redis::Connection, node_id: i64, problem_iden: &String) -> Result<TrainingList> {
//     let mut problem_list = get_training_problem_list(db, redis, node_id).await?;
//     let problem = get_problem(db, redis, problem_iden).await?;
//     let mut found = false;
//     for (i, p) in problem_list.own_problem.iter().enumerate() {
//         if let TrainingProblem::ProblemIden(iden) = p {
//             if iden == problem_iden {
//                 found = true;
             
//                 problem_list.own_problem.remove(i);
//                 break;
//             }
//         }
//     }
//     if !found {
//         return Err(CoreError::NotFound(format!("Problem {problem_iden} not found in training.")));
//     }
//     Ok(problem_list)
// }
