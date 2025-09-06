use async_recursion::async_recursion;
use chrono::NaiveDateTime;
use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};
use crate::graph::edge::EdgeRaw;
use crate::graph::edge::training_problem::{TrainingProblemEdge, TrainingProblemEdgeRaw};
use crate::graph::node::NodeRaw;
use crate::Result;
use crate::graph::node::training::{TrainingNode, TrainingNodePrivateRaw, TrainingNodePublicRaw, TrainingNodeRaw};
use crate::graph::node::training::problem::{TrainingProblemNode, TrainingProblemNodePrivateRaw, TrainingProblemNodePublicRaw, TrainingProblemNodeRaw};
use crate::model::problem::get_problem;

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