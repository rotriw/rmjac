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
use crate::error::CoreError;
use crate::graph::action::get_node_type;
use crate::graph::node::record::RecordStatus;
use crate::graph::node::training::{TrainingNode, TrainingNodePrivateRaw, TrainingNodePublicRaw, TrainingNodeRaw};
use crate::graph::node::training::problem::{TrainingProblemNode, TrainingProblemNodePrivateRaw, TrainingProblemNodePublicRaw, TrainingProblemNodeRaw};
use crate::model::problem::ProblemRepository;
use crate::model::ModelStore;
use crate::model::record::RecordRepository;
use crate::service::iden::{create_iden, get_node_id_iden, get_node_ids_from_iden};

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

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Training {
    pub training_node: TrainingNode,
    pub problem_list: TrainingList,
}

#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
pub struct TrainingListStatus {
    pub total_task: i64,
    pub completed_task: i64,
    pub tried_task: i64,
    pub total_score: f64,
    pub data: HashMap<i64, String>,
}

pub struct TrainingRepo;

impl TrainingRepo {
    pub async fn create(
        db: &DatabaseConnection,
        redis: &mut redis::Connection,
        title: &str,
        user_iden: &str,
        pb_iden: &str,
        desc_pub: &str,
        desc_priv: &str,
        start: NaiveDateTime,
        end: NaiveDateTime,
        kind: &str,
        list: &TrainingList,
        _write_perm: Vec<i64>,
        _read_perm: Vec<i64>,
    ) -> Result<TrainingNode> {
        let node = new_training_node(
            db,
            title,
            pb_iden,
            desc_pub,
            desc_priv,
            start,
            end,
            kind,
        )
        .await?;

        if let Ok(problem_root) = Self::build_tree(db, redis, list).await {
            attach_problem_root(db, node.node_id, problem_root.node_id).await?;
        }

        let iden = training_key(user_iden, pb_iden);
        create_iden(db, redis, iden.as_str(), vec![node.node_id]).await?;

        log::info!("Granting training creator permissions for user {}", user_iden);
        if let Some(creator_node_id) = first_node_id(get_node_ids_from_iden(db, redis, user_iden).await?) {
            Self::set_creator_perm(db, creator_node_id, node.node_id).await?;
        }

        Ok(node)
    }

    pub async fn create_as(
        db: &DatabaseConnection,
        redis: &mut redis::Connection,
        title: &str,
        user_iden: &str,
        pb_iden: &str,
        desc_pub: &str,
        desc_priv: &str,
        start: NaiveDateTime,
        end: NaiveDateTime,
        kind: &str,
        list: &TrainingList,
        write_perm: Vec<i64>,
        read_perm: Vec<i64>,
        user_node_id: i64,
    ) -> Result<TrainingNode> {
        log::info!("Creating new training with token, title:{}", title);

        let training_node = Self::create(
            db,
            redis,
            title,
            user_iden,
            pb_iden,
            desc_pub,
            desc_priv,
            start,
            end,
            kind,
            list,
            write_perm,
            read_perm,
        ).await?;
        Self::set_creator_perm(db, user_node_id, training_node.node_id).await?;
        Ok(training_node)
    }

    #[async_recursion(?Send)]
    pub async fn build_tree(
        db: &DatabaseConnection,
        redis: &mut redis::Connection,
        problem: &TrainingList,
    ) -> Result<TrainingProblemNode> {
        let node = new_problem_node(db, problem).await?;
        for (order, item) in problem.own_problem.iter().enumerate() {
            match item {
                TrainingProblem::ProblemTraining(sub) => {
                    if let Ok(sub_node) = Self::build_tree(db, redis, sub).await {
                        attach_problem_edge(db, node.node_id, sub_node.node_id, order, TrainingProblemType::Default).await?;
                    }
                }
                TrainingProblem::ProblemIden((_edge_id, iden)) => {
                    if let Some(problem_node) = resolve_problem_node(db, redis, iden).await? {
                        attach_problem_edge(db, node.node_id, problem_node, order, TrainingProblemType::Default).await?;
                    } else {
                        return Ok(node);
                    }
                }
                _ => {}
            }
        }
        Ok(node)
    }

    pub async fn build_list(
        db: &DatabaseConnection,
        redis: &mut redis::Connection,
        problem_list: &TrainingList,
        list_id: i64
    ) -> Result<TrainingProblemNode> {
        let training_problem_node = Self::build_tree(db, redis, problem_list).await?;
        let problem_list = Self::list_order(db, redis, list_id).await?;
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

    #[async_recursion]
    pub async fn list(db: &DatabaseConnection, redis: &mut redis::Connection, node_id: i64) -> Result<TrainingList> {
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
                        let problem_iden = {
                            let mut store = (db, &mut *redis);
                            ProblemRepository::iden(&mut store, next_node_id).await?
                        };
                        result.own_problem.push(TrainingProblem::ProblemIden((edge.id, problem_iden)));
                    } else {
                        let sub_problem = Self::list(db, redis, next_node_id).await?;
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
                    let _ = get_node_id_iden(db, redis, next_node_id).await?[0].clone();
                }
            }
        }
        Ok(result)
    }

    pub async fn list_order(db: &DatabaseConnection, _redis: &mut redis::Connection, node_id: i64) -> Result<Vec<(i64, i64)>> {
        let _training_problem_node = TrainingProblemNode::from_db(db, node_id).await?;
        let mut result = vec![];
        let edges = TrainingProblemEdgeQuery::get_order_asc_extend(node_id, db).await?;
        for edge in edges {
            result.push((edge.v, edge.order));
        }
        Ok(result)
    }

    pub async fn edges(db: &DatabaseConnection, _redis: &mut redis::Connection, node_id: i64) -> Result<Vec<TrainingProblemEdge>> {
        let _training_problem_node = TrainingProblemNode::from_db(db, node_id).await?;
        TrainingProblemEdgeQuery::get_order_asc_extend(node_id, db).await
    }

    pub async fn node_id(db: &DatabaseConnection, redis: &mut redis::Connection, user_iden: &str, pb_iden: &str) -> Result<i64> {
        let user_id = get_user_by_iden(db, user_iden).await?.node_id.to_string();
        Ok(get_node_ids_from_iden(db, redis, training_key(&user_id, pb_iden).as_str()).await?[0])
    }

    pub async fn get(db: &DatabaseConnection, redis: &mut redis::Connection, node_id: i64) -> Result<Training> {
        let training_node = TrainingNode::from_db(db, node_id).await?;
        let edges = TrainingProblemEdgeQuery::get_order_asc_extend(training_node.node_id, db).await?;
        if edges.is_empty() {
            return Err(CoreError::NotFound("No problem list found for this training".to_string()));
        }
        let training_problem_node_id = edges[0].v;
        let problem_list = Self::list(db, redis, training_problem_node_id).await?;
        let result = Training {
            training_node,
            problem_list,
        };
        let _ = redis.set::<_, _>(format!("training_{node_id}"), serde_json::to_string(&result)?);
        Ok(result)
    }

    pub async fn root_id(db: &DatabaseConnection, _redis: &mut redis::Connection, node_id: i64) -> Result<i64> {
        let edges = TrainingProblemEdgeQuery::get_order_asc_extend(node_id, db).await?;
        if edges.is_empty() {
            return Err(CoreError::NotFound("No problem list found for this training".to_string()));
        }
        Ok(edges[0].v)
    }

    pub async fn add(db: &DatabaseConnection, redis: &mut redis::Connection, node_id: i64, problem_node_id: i64) -> Result<Vec<(i64, i64)>> {
        let mut problem_list = Self::list_order(db, redis, node_id).await?;
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

    pub async fn add_preset(db: &DatabaseConnection, redis: &mut redis::Connection, node_id: i64, preset_id: i64) -> Result<Vec<(i64, i64)>> {
        let preset_problem_list = Self::list_order(db, redis, preset_id).await?;
        let mut problem_list = Self::list_order(db, redis, node_id).await?;
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

    pub async fn add_list_ref(db: &DatabaseConnection, redis: &mut redis::Connection, node_id: i64, exist_list: i64) -> Result<Vec<(i64, i64)>> {
        let mut problem_list = Self::list_order(db, redis, node_id).await?;
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

    pub async fn add_by_iden(db: &DatabaseConnection, redis: &mut redis::Connection, node_id: i64, problem_iden: &String) -> Result<Vec<(i64, i64)>> {
        let (problem_node_id, statement_node_id) = {
            let mut store = (db, &mut *redis);
            ProblemRepository::resolve(&mut store, problem_iden).await?
        };
        Self::add(db, redis, node_id, if statement_node_id != -1 {
            statement_node_id
        } else {
            problem_node_id
        }).await
    }

    pub async fn set_order(db: &DatabaseConnection, _redis: &mut redis::Connection, training_list_id: i64, orders: Vec<(i64, i64)>) -> Result<()> {
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

    pub async fn purge(
        db: &DatabaseConnection,
        redis: &mut redis::Connection,
        user_iden: &str,
        training_iden: &str,
    ) -> Result<()> {
        log::info!("Starting to delete connections for training: {}#{}", user_iden, training_iden);

        let iden = training_key(user_iden, training_iden);
        let node_ids = get_node_ids_from_iden(db, redis, &iden).await?;
        if node_ids.is_empty() {
            return Err(CoreError::NotFound("Cannot find training with this iden".to_string()));
        }

        let training_node_id = node_ids[0];
        let problem_node_ids = TrainingProblemEdgeQuery::get_v(training_node_id, db).await?;

        for problem_node_id in problem_node_ids {
            TrainingProblemEdgeQuery::delete(db, training_node_id, problem_node_id).await?;
        }

        let _ = redis.del::<_>(format!("training_{training_node_id}"));

        log::info!("Successfully deleted all connections for training: {}#{}", user_iden, training_iden);
        Ok(())
    }

    pub async fn rm_all(
        db: &DatabaseConnection,
        redis: &mut redis::Connection,
        user_iden: &str,
        training_iden: &str,
        problem_iden: &str,
    ) -> Result<()> {
        log::info!("Removing problem {} from training {}#{}", problem_iden, user_iden, training_iden);

        let training_iden_full = training_key(user_iden, training_iden);
        let training_node_ids = get_node_ids_from_iden(db, redis, &training_iden_full).await?;
        if training_node_ids.is_empty() {
            return Err(CoreError::NotFound("Cannot find training with this iden".to_string()));
        }
        let training_node_id = training_node_ids[0];

        let problem_node_ids = get_node_ids_from_iden(db, redis, problem_iden).await?;
        if problem_node_ids.is_empty() {
            return Err(CoreError::NotFound("Cannot find problem with this iden".to_string()));
        }

        let mut problem_node_id = -1;
        for &node_id in &problem_node_ids {
            if let Ok(node_type) = get_node_type(db, node_id).await
                && node_type == "problem" {
                    problem_node_id = node_id;
                    break;
                }
        }

        if problem_node_id == -1 {
            problem_node_id = problem_node_ids[0];
        }

        TrainingProblemEdgeQuery::delete(db, training_node_id, problem_node_id).await?;

        let _ = redis.del::<_>(format!("training_{training_node_id}"));

        log::info!("Successfully removed problem {} from training {}#{}", problem_iden, user_iden, training_iden);
        Ok(())
    }

    pub async fn rm_one(
        db: &DatabaseConnection,
        redis: &mut redis::Connection,
        training_node_id: i64,
        problem_node_id: i64,
    ) -> Result<()> {
        log::info!("Removing problem {} from training {}", problem_node_id, training_node_id);

        TrainingProblemEdgeQuery::delete(db, training_node_id, problem_node_id).await?;
        let _ = redis.del::<_>(format!("training_{training_node_id}"));

        log::info!("Successfully removed problem {} from training {}", problem_node_id, training_node_id);
        Ok(())
    }

    pub async fn set_desc(
        db: &DatabaseConnection,
        training_node_id: i64,
        desc_pub: &str,
        desc_priv: &str,
    ) -> Result<TrainingNode> {
        log::info!("Updating training {} descriptions", training_node_id);

        let training_node = TrainingNode::from_db(db, training_node_id).await?;

        use crate::db::entity::node::training::Column::{DescriptionPublic, DescriptionPrivate};
        let updated_training = training_node
            .modify(db, DescriptionPublic, desc_pub.to_string())
            .await?
            .modify(db, DescriptionPrivate, desc_priv.to_string())
            .await?;

        log::info!("Successfully updated training {} descriptions", training_node_id);
        Ok(updated_training)
    }

    pub async fn set_creator_perm(
        db: &DatabaseConnection,
        user_node_id: i64,
        training_node_id: i64,
    ) -> Result<()> {
        log::info!("Granting training creator permissions: user {} -> training {}", user_node_id, training_node_id);

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

    pub async fn grant_access(
        db: &DatabaseConnection,
        user_node_id: i64,
        training_node_id: i64,
    ) -> Result<()> {
        log::info!("Granting training access: user {} -> training {}", user_node_id, training_node_id);

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
    pub async fn has_list(
        db: &DatabaseConnection,
        redis: &mut redis::Connection,
        now_node_id: i64,
        list_node_id: i64,
    ) -> Result<bool> {
        if now_node_id == list_node_id {
            return Ok(true);
        }
        let problem_list = Self::list_order(db, redis, now_node_id).await?;
        for (node_id, _) in problem_list {
            if node_id == list_node_id {
                return Ok(true);
            } else {
                let node_type = get_node_type(db, node_id).await?;
                if node_type == "training_problem" {
                    if Self::has_list(db, redis, node_id, list_node_id).await? {
                        return Ok(true);
                    }
                }
            }
        }
        Ok(false)
    }

    #[async_recursion]
    pub async fn status(
        db: &DatabaseConnection,
        redis: &mut redis::Connection,
        user_node_id: i64,
        training_node_id: i64,
    ) -> Result<TrainingListStatus> {
        let value = redis.exists(format!("user_training_vis_{user_node_id}_{training_node_id}"))?;
        if value {
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
                let problem_status = RecordRepository::user_status(db, user_node_id, edge.v).await;
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
                let sub_status = Self::status(db, redis, user_node_id, edge.v).await;
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
}

impl Training {
    pub async fn create(
        store: &mut impl ModelStore,
        title: &str,
        user_iden: &str,
        pb_iden: &str,
        desc_pub: &str,
        desc_priv: &str,
        start: NaiveDateTime,
        end: NaiveDateTime,
        kind: &str,
        list: &TrainingList,
        write_perm: Vec<i64>,
        read_perm: Vec<i64>,
    ) -> Result<TrainingNode> {
        let db = store.get_db().clone();
        let redis = store.get_redis();
        TrainingRepo::create(
            &db,
            redis,
            title,
            user_iden,
            pb_iden,
            desc_pub,
            desc_priv,
            start,
            end,
            kind,
            list,
            write_perm,
            read_perm,
        )
        .await
    }

    pub async fn create_as(
        store: &mut impl ModelStore,
        title: &str,
        user_iden: &str,
        pb_iden: &str,
        desc_pub: &str,
        desc_priv: &str,
        start: NaiveDateTime,
        end: NaiveDateTime,
        kind: &str,
        list: &TrainingList,
        write_perm: Vec<i64>,
        read_perm: Vec<i64>,
        user_node_id: i64,
    ) -> Result<TrainingNode> {
        let db = store.get_db().clone();
        let redis = store.get_redis();
        TrainingRepo::create_as(
            &db,
            redis,
            title,
            user_iden,
            pb_iden,
            desc_pub,
            desc_priv,
            start,
            end,
            kind,
            list,
            write_perm,
            read_perm,
            user_node_id,
        )
        .await
    }

    pub async fn get(store: &mut impl ModelStore, node_id: i64) -> Result<Self> {
        let db = store.get_db().clone();
        let redis = store.get_redis();
        TrainingRepo::get(&db, redis, node_id).await
    }

    pub async fn node_id(store: &mut impl ModelStore, user_iden: &str, pb_iden: &str) -> Result<i64> {
        let db = store.get_db().clone();
        let redis = store.get_redis();
        TrainingRepo::node_id(&db, redis, user_iden, pb_iden).await
    }

    pub async fn root_id(store: &mut impl ModelStore, node_id: i64) -> Result<i64> {
        let db = store.get_db().clone();
        let redis = store.get_redis();
        TrainingRepo::root_id(&db, redis, node_id).await
    }

    pub async fn add_by_iden(
        store: &mut impl ModelStore,
        node_id: i64,
        problem_iden: &String,
    ) -> Result<Vec<(i64, i64)>> {
        let db = store.get_db().clone();
        let redis = store.get_redis();
        TrainingRepo::add_by_iden(&db, redis, node_id, problem_iden).await
    }

    pub async fn build_list(
        store: &mut impl ModelStore,
        problem_list: &TrainingList,
        list_id: i64,
    ) -> Result<TrainingProblemNode> {
        let db = store.get_db().clone();
        let redis = store.get_redis();
        TrainingRepo::build_list(&db, redis, problem_list, list_id).await
    }

    pub async fn set_order(
        store: &mut impl ModelStore,
        training_list_id: i64,
        orders: Vec<(i64, i64)>,
    ) -> Result<()> {
        let db = store.get_db().clone();
        let redis = store.get_redis();
        TrainingRepo::set_order(&db, redis, training_list_id, orders).await
    }

    pub async fn set_desc(
        store: &mut impl ModelStore,
        training_node_id: i64,
        desc_pub: &str,
        desc_priv: &str,
    ) -> Result<TrainingNode> {
        let db = store.get_db().clone();
        TrainingRepo::set_desc(&db, training_node_id, desc_pub, desc_priv).await
    }

    pub async fn has_list(
        store: &mut impl ModelStore,
        now_node_id: i64,
        list_node_id: i64,
    ) -> Result<bool> {
        let db = store.get_db().clone();
        let redis = store.get_redis();
        TrainingRepo::has_list(&db, redis, now_node_id, list_node_id).await
    }

    pub async fn status(
        store: &mut impl ModelStore,
        user_node_id: i64,
        training_node_id: i64,
    ) -> Result<TrainingListStatus> {
        let db = store.get_db().clone();
        let redis = store.get_redis();
        TrainingRepo::status(&db, redis, user_node_id, training_node_id).await
    }
}

// Private helpers
fn training_key(user_iden: &str, pb_iden: &str) -> String {
    format!("training#{user_iden}#{pb_iden}")
}

fn first_node_id(ids: Vec<i64>) -> Option<i64> {
    ids.first().copied()
}

async fn new_training_node(
    db: &DatabaseConnection,
    title: &str,
    pb_iden: &str,
    description_public: &str,
    description_private: &str,
    start_time: NaiveDateTime,
    end_time: NaiveDateTime,
    training_type: &str,
) -> Result<TrainingNode> {
    TrainingNodeRaw {
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
        },
    }
    .save(db)
    .await
}

async fn attach_problem_root(
    db: &DatabaseConnection,
    training_node_id: i64,
    problem_root_id: i64,
) -> Result<TrainingProblemEdge> {
    TrainingProblemEdgeRaw {
        u: training_node_id,
        v: problem_root_id,
        order: 0,
        problem_type: TrainingProblemType::Default,
    }
    .save(db)
    .await
}

async fn new_problem_node(db: &DatabaseConnection, problem: &TrainingList) -> Result<TrainingProblemNode> {
    TrainingProblemNodeRaw {
        public: TrainingProblemNodePublicRaw {
            description: problem.description.to_string(),
        },
        private: TrainingProblemNodePrivateRaw {},
    }
    .save(db)
    .await
}

async fn attach_problem_edge(
    db: &DatabaseConnection,
    from: i64,
    to: i64,
    order: usize,
    kind: TrainingProblemType,
) -> Result<TrainingProblemEdge> {
    TrainingProblemEdgeRaw {
        u: from,
        v: to,
        order: order as i64,
        problem_type: kind,
    }
    .save(db)
    .await
}

async fn resolve_problem_node(
    db: &DatabaseConnection,
    redis: &mut redis::Connection,
    iden: &str,
) -> Result<Option<i64>> {
    let mut store = (db, redis);
    match ProblemRepository::resolve(&mut store, iden).await {
        Ok((problem_node_id, _)) => Ok(Some(problem_node_id)),
        Err(_) => Ok(None),
    }
}