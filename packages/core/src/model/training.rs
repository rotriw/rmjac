use sea_orm::{ColumnTrait, Database};
use async_recursion::async_recursion;
use chrono::NaiveDateTime;
use redis::Commands;
use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};
use crate::graph::edge::{EdgeQuery, EdgeQueryOrder, EdgeRaw};
use crate::graph::edge::iden::IdenEdgeQuery;
use crate::graph::edge::training_problem::{TrainingProblemEdge, TrainingProblemEdgeQuery, TrainingProblemEdgeRaw};
use crate::graph::node::{Node, NodeRaw};
use crate::{db, env, Result};
use crate::error::CoreError;
use crate::graph::action::get_node_type;
use crate::graph::node::training::{TrainingNode, TrainingNodePrivateRaw, TrainingNodePublicRaw, TrainingNodeRaw};
use crate::graph::node::training::problem::{TrainingProblemNode, TrainingProblemNodePrivateRaw, TrainingProblemNodePublicRaw, TrainingProblemNodeRaw};
use crate::model::problem::{get_problem, get_statement_string_iden};

#[allow(clippy::too_many_arguments)]
pub async fn create_training(
    db: &DatabaseConnection,
    redis: &mut redis::Connection,
    title: &str,
    iden: &str,
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
            iden: iden.to_string(),
            description: description_public.to_string(),
            start_time: start_time,
            end_time: end_time,
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
    if iden == "" {
        return Ok(now_id);
    }
    use db::entity::edge::iden::Column as IdenColumn;
    let edges = IdenEdgeQuery::get_v_filter(now_id, IdenColumn::Iden.eq(now_id), db).await?;
    if edges.len() > 0 {
        return Err(CoreError::NotFound(format!("{pathd} not found.")));
    }
    Ok(edges[0])
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Training {
    training_node: TrainingNode,
    problem_list: TrainingList,
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
            let problem_iden = get_statement_string_iden(db, redis, node_id, None, 200).await?;
            result.own_problem.push(TrainingProblem::ProblemIden(problem_iden));
        } else {
            let sub_problem = get_training_problem_list(db, redis, next_node_id).await?;
            result.own_problem.push(TrainingProblem::ProblemTraining(sub_problem));
        }
    }
    Ok(result)
}

pub async fn get_training(db: &DatabaseConnection, redis: &mut redis::Connection, user_iden: &str, pb_iden: &str) -> Result<Training> {
    let mut usable = false;
    let iden_id = 'scope: {
        if let Ok(value) = redis.get::<_, String>(format!("iden_{user_iden}/{pb_iden}")) {
            if let Ok(id) = value.as_str().parse::<i64>() {
                break 'scope id;
            }
        }
        let env_node_id = env::DEFAULT_NODES.lock().unwrap().default_training_iden_node.clone();
        let iden = get_training_node_id_by_iden(db, redis, user_iden, env_node_id, "user").await?;
        let iden = get_training_node_id_by_iden(db, redis, pb_iden, iden, "training").await?;
        usable = true;
        iden
    };
    if usable == false {
        redis.set::<_, _, ()>(format!("iden_{user_iden}/{pb_iden}"), iden_id.to_string());
    }
    if let Ok(value) = redis.get::<_, String>(format!("training_{iden_id}")) {
        if let Ok(result) = serde_json::from_str::<Training>(&value) {
            return Ok(result);
        }
    }
    let training_node = TrainingNode::from_db(db, iden_id).await?;
    let problem_list = get_training_problem_list(db, redis, training_node.node_id).await?;
    let result = Training {
        training_node,
        problem_list,
    };
    redis.set::<_, _, ()>(format!("training_{iden_id}"), serde_json::to_string(&result).unwrap());
    Ok(result)
}
