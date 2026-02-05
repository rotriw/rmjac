use crate::error::CoreError;
use crate::graph::action::get_node_type;
use crate::graph::edge::judge::{JudgeEdgeQuery, JudgeEdgeRaw};
use crate::graph::edge::problem_statement::ProblemStatementEdgeQuery;
use crate::graph::edge::record::{RecordEdge, RecordEdgeQuery, RecordEdgeRaw};
use crate::graph::edge::testcase::{TestcaseEdgeQuery, TestcaseEdgeRaw};
use crate::graph::edge::{Edge, EdgeQuery, EdgeQueryOrder, EdgeRaw};
use crate::graph::node::record::subtask::{
    SubtaskCalcMethod, SubtaskNode, SubtaskNodePrivateRaw, SubtaskNodePublicRaw, SubtaskNodeRaw,
};
use crate::graph::node::record::testcase::{
    JudgeDiffMethod, JudgeIOMethod, TestcaseNode, TestcaseNodePrivateRaw, TestcaseNodePublicRaw,
    TestcaseNodeRaw,
};
use crate::graph::node::record::{
    RecordNode, RecordNodePrivateRaw, RecordNodePublicRaw, RecordNodeRaw, RecordStatus,
};
use crate::graph::node::{Node, NodeRaw};
use crate::service::socket::calc::handle_score;
use crate::{Result, db};
use enum_const::EnumConst;
use redis::TypedCommands;
use sea_orm::sea_query::{IntoCondition, SimpleExpr};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, NotSet, QueryFilter,
    QueryOrder, QuerySelect, Set,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use sea_orm::sea_query::SimpleExpr::Column;
use tap::Conv;
use crate::db::entity::node::user::get_user_by_iden;
use crate::model::problem::ProblemImport;
use crate::service::perm::provider::{Pages, PagesPermService};

pub trait ModelStore {
    fn get_db(&self) -> &DatabaseConnection;
    fn get_redis(&mut self) -> &mut redis::Connection;
}

impl<'a> ModelStore for (&'a DatabaseConnection, &'a mut redis::Connection) {
    fn get_db(&self) -> &DatabaseConnection {
        self.0
    }
    fn get_redis(&mut self) -> &mut redis::Connection {
        self.1
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct RecordNewProp {
    pub platform: String,
    pub code: String,
    pub code_language: String,
    pub url: String,
    pub statement_node_id: i64,
    pub public_status: bool,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct SubtaskUserRecord {
    pub time: i64,
    pub memory: i64,
    pub status: RecordStatus,
    pub subtask_status: Vec<SubtaskUserRecord>,
    pub score: i64,
}

pub struct UpdateRecordRootStatusData {
    pub record_id: i64,
    pub time: i64,
    pub memory: i64,
    pub status: RecordStatus,
    pub score: i64,
}

pub struct RecordImport;

impl RecordImport {
    pub async fn by_statement(
        db: &DatabaseConnection,
        statement_node_id: i64,
    ) -> Result<Vec<RecordNode>> {
        log::debug!("Finding records for statement node {}", statement_node_id);

        use crate::db::entity::node::record::Column::StatementId;
        let records = RecordNode::from_db_filter(db, StatementId.eq(statement_node_id)).await?;

        log::debug!(
            "Found {} records for statement node {}",
            records.len(),
            statement_node_id
        );
        Ok(records)
    }

    pub async fn by_url(
        db: &DatabaseConnection,
        submission_url: &str,
    ) -> Result<Option<RecordNode>> {
        log::debug!("Finding record for submission URL {}", submission_url);

        use crate::db::entity::node::record::Column::RecordUrl;
        let records =
            RecordNode::from_db_filter(db, RecordUrl.eq(submission_url.to_string())).await?;

        if records.is_empty() {
            log::debug!("No record found for submission URL {}", submission_url);
            Ok(None)
        } else {
            log::debug!("Found record for submission URL {}", submission_url);
            Ok(Some(records[0].clone()))
        }
    }

    pub async fn purge_statement(
        db: &DatabaseConnection,
        statement_node_id: i64,
    ) -> Result<Vec<RecordNode>> {
        log::info!(
            "Deleting all records for statement node {}",
            statement_node_id
        );

        let records = Self::by_statement(db, statement_node_id).await?;
        let mut deleted_records = Vec::new();

        for record in records {
            let deleted_record = Record::new(record.node_id).delete(db).await?;
            deleted_records.push(deleted_record);
        }

        log::info!(
            "Successfully deleted {} records for statement node {}",
            deleted_records.len(),
            statement_node_id
        );
        Ok(deleted_records)
    }

    pub async fn by_user<T: IntoCondition>(
        db: &DatabaseConnection,
        user_id: i64,
        number_per_page: u64,
        page: u64,
        filter: Vec<T>,
    ) -> Result<Vec<RecordEdge>> {
        log::debug!("Getting records for user id: {}", user_id);
        let page = if page < 1 { 1 } else { page };
        let offset = number_per_page * (page - 1);

        RecordEdgeQuery::get_v_filter_extend_content(
            user_id,
            filter,
            db,
            Some(number_per_page),
            Some(offset),
        )
        .await
    }

    pub async fn by_problem<T: IntoCondition>(
        db: &DatabaseConnection,
        problem_id: i64,
        number_per_page: u64,
        page: u64,
        filter: Vec<T>,
    ) -> Result<Vec<RecordEdge>> {
        log::debug!("Getting records for problem id: {}", problem_id);
        let page = if page < 1 { 1 } else { page };
        let offset = number_per_page * (page - 1);

        use db::entity::edge::record::{Column, Entity};

        // Build query with filters
        let mut query = Entity::find();
        for f in filter {
            query = query.filter(f);
        }
        query = query.filter(Column::VNodeId.eq(problem_id));
        query = query.offset(offset).limit(number_per_page);

        let edges = query.all(db).await?;
        Ok(edges.into_iter().map(|e| e.into()).collect())
    }

    pub async fn by_node<T: IntoCondition>(
        db: &DatabaseConnection,
        node_id: i64,
        number_per_page: u64,
        page: u64,
        filter: Vec<T>,
    ) -> Result<Vec<RecordEdge>> {
        log::debug!("Getting records for node id: {}", node_id);

        // Try to determine node type and call appropriate function
        let node_type = get_node_type(db, node_id).await?;
        match node_type.as_str() {
            "user" => Self::by_user(db, node_id, number_per_page, page, filter).await,
            "problem" | "problem_statement" => {
                Self::by_problem(db, node_id, number_per_page, page, filter).await
            }
            _ => {
                // For unknown types, default to user records
                Self::by_user(db, node_id, number_per_page, page, filter).await
            }
        }
    }

    pub async fn by_user_statement(
        db: &DatabaseConnection,
        user_id: i64,
        statement_id: i64,
        number_per_page: u64,
        page: u64,
    ) -> Result<Vec<RecordEdge>> {
        log::debug!(
            "Getting records for user id: {} and statement id: {}",
            user_id,
            statement_id
        );
        let page = if page < 1 { 1 } else { page };
        let offset = number_per_page * (page - 1);

        use db::entity::edge::record::Column;

        RecordEdgeQuery::get_v_filter_extend_content(
            user_id,
            vec![Column::VNodeId.eq(statement_id)],
            db,
            Some(number_per_page),
            Some(offset),
        )
        .await
    }

    pub async fn user_status(
        db: &DatabaseConnection,
        user_id: i64,
        problem_id: i64,
    ) -> Result<RecordStatus> {
        let node_type = get_node_type(db, problem_id).await?;
        use db::entity::edge::record::Column;
        log::info!("Getting records for user id: {} {}", user_id, problem_id);
        // Now edge is user->problem, so we filter by u_node_id=user_id and v_node_id=problem_id
        let get_record = RecordEdgeQuery::get_v_filter_extend_content(
            user_id,
            vec![
                Column::RecordStatus.eq(RecordStatus::Accepted.get_const_isize().unwrap() as i64),
                Column::VNodeId.eq(problem_id),
            ],
            db,
            None,
            None,
        )
        .await?;
        if !get_record.is_empty() {
            Ok(RecordStatus::Accepted)
        } else {
            let get_record = RecordEdgeQuery::get_v_filter_extend_content(
                user_id,
                vec![Column::VNodeId.eq(problem_id)],
                db,
                None,
                None,
            )
            .await?;
            if !get_record.is_empty() {
                return Ok(RecordStatus::Waiting);
            }
            Ok(RecordStatus::NotFound)
        }
    }

    pub async fn testcase_count(store: &mut impl ModelStore, root_id: i64) -> Result<i64> {
        let db = store.get_db().clone();
        let redis = store.get_redis();

        let testcase_number = redis.get(format!("graph_node_{}_testcase_number", root_id))?;
        if let Some(testcase_number) = testcase_number {
            return Ok(testcase_number.parse::<i64>().unwrap_or(0));
        }
        let mut count = 0;
        let mut q = queue::Queue::new();
        let _ = q.queue(root_id);
        while !q.is_empty() {
            let t = q.dequeue().unwrap();
            // check graph_node_{t}_v is not empty
            let graph_data = redis.get(format!("graph_node_{t}_v"))?;
            if graph_data.is_none() {
                let v_data = TestcaseNode::from_db(&db, t).await?;
                redis
                    .set(
                        format!("graph_node_{t}_v"),
                        serde_json::to_string(&v_data).unwrap(),
                    )
                    .unwrap();
            }
            let data = redis.get(format!("graph_edge_testcase_{t}_v"))?;
            let edges = if let Some(data) = data {
                data.split(".")
                    .map(|v| v.parse::<i64>().unwrap_or(0))
                    .collect::<Vec<i64>>()
            } else {
                let data = TestcaseEdgeQuery::get_v(t, &db).await?;
                redis
                    .set(
                        format!("graph_edge_testcase_{t}_v"),
                        data.iter()
                            .map(|v| v.to_string())
                            .collect::<Vec<String>>()
                            .join("."),
                    )
                    .unwrap();
                data
            };
            if edges.is_empty() {
                count += 1;
            }
            for ver in edges {
                let _ = q.queue(ver);
            }
        }
        redis
            .set(
                format!("graph_node_{}_testcase_number", root_id),
                count.to_string(),
            )
            .unwrap();
        Ok(count)
    }
}

pub struct RecordFactory;

impl RecordFactory {
    pub async fn create_archived(
        db: &DatabaseConnection,
        record: RecordNewProp,
        user_node_id: i64,
        problem_node_id: i64,
    ) -> Result<RecordNode> {
        log::debug!("Creating record schema with properties: {:?}", record);
        let record_node = RecordNodeRaw {
            public: RecordNodePublicRaw {
                record_message: None,
                record_platform: record.platform.to_string(),
                record_url: Some(record.url.to_string()),
                record_time: chrono::Utc::now().naive_utc(),
                public_status: record.public_status,
                record_score: 0,
                record_status: RecordStatus::OnlyArchived,
                statement_id: record.statement_node_id,
            },
            private: RecordNodePrivateRaw {
                code: record.code.to_string(),
                code_language: record.code_language.to_string(),
            },
        }
            .save(db)
            .await?;

        // Create edge: user -> problem, with record_node_id pointing to the detailed record node
        let _user_problem_edge = RecordEdgeRaw {
            u: user_node_id,
            v: problem_node_id,
            record_node_id: record_node.node_id,
            record_status: RecordStatus::OnlyArchived,
            code_length: record_node.private.code.len() as i64,
            score: 0,
            submit_time: chrono::Utc::now().naive_utc(),
            platform: record.platform.to_string(),
        }
            .save(db)
            .await?;

        Ok(record_node)
    }

    pub async fn create(
        db: &DatabaseConnection,
        record: RecordNewProp,
        user_node_id: i64,
        status: RecordStatus,
        score: i64,
        time: chrono::NaiveDateTime,
    ) -> Result<RecordNode> {
        log::debug!("Creating record schema with properties: {:?}", record);
        let record_node = RecordNodeRaw {
            public: RecordNodePublicRaw {
                record_message: None,
                record_platform: record.platform.to_string(),
                record_url: Some(record.url.to_string()),
                record_time: time,
                public_status: record.public_status,
                record_score: score,
                record_status: status,
                statement_id: record.statement_node_id,
            },
            private: RecordNodePrivateRaw {
                code: record.code.to_string(),
                code_language: record.code_language.to_string(),
            },
        }
            .save(db)
            .await?;

        // Create edge: user -> problem, with record_node_id pointing to the detailed record node
        let _user_problem_edge = RecordEdgeRaw {
            u: user_node_id,
            v: record.statement_node_id,
            record_node_id: record_node.node_id,
            record_status: status,
            code_length: record_node.private.code.len() as i64,
            score: 0,
            submit_time: time,
            platform: record.platform.to_string(),
        }
            .save(db)
            .await?;

        PagesPermService::add(user_node_id, record_node.node_id, Pages::All, db).await;

        Ok(record_node)
    }
}

pub struct Record {
    pub node_id: i64,
}

impl Record {
    pub fn new(node_id: i64) -> Self {
        Self { node_id }
    }
    pub async fn set_status(
        &self,
        db: &DatabaseConnection,
        new_status: RecordStatus,
    ) -> Result<RecordNode> {
        log::trace!(
            "Updating record {} status to {:?}",
            self.node_id,
            new_status
        );

        let record_node = RecordNode::from_db(db, self.node_id).await?;

        use crate::db::entity::node::record::Column::RecordStatus;
        let updated_record = record_node
            .modify(db, RecordStatus, i64::from(new_status))
            .await?;

        log::trace!(
            "Successfully updated record {} status to {:?}",
            self.node_id,
            new_status
        );
        Ok(updated_record)
    }

    pub async fn delete(&self, db: &DatabaseConnection) -> Result<RecordNode> {
        log::info!("Soft deleting record {}", self.node_id);

        self.set_status(db, RecordStatus::Deleted).await
    }

    pub async fn set_score(&self, db: &DatabaseConnection, score: i64) -> Result<RecordNode> {
        log::trace!("Updating record {} score to {}", self.node_id, score);

        let record_node = RecordNode::from_db(db, self.node_id).await?;

        use crate::db::entity::node::record::Column::RecordScore;
        let updated_record = record_node.modify(db, RecordScore, score).await?;

        log::trace!(
            "Successfully updated record {} score to {}",
            self.node_id,
            score
        );
        Ok(updated_record)
    }

    pub async fn set_message(
        &self,
        db: &DatabaseConnection,
        message: Option<String>,
    ) -> Result<RecordNode> {
        log::trace!("Updating record {} message", self.node_id);

        let record_node = RecordNode::from_db(db, self.node_id).await?;

        use crate::db::entity::node::record::Column::RecordMessage;
        let updated_record = record_node.modify(db, RecordMessage, message).await?;

        log::trace!("Successfully updated record {} message", self.node_id);
        Ok(updated_record)
    }

    pub async fn update_root_status(
        &self,
        store: &mut impl ModelStore,
        data: UpdateRecordRootStatusData,
    ) -> Result<()> {
        let db = store.get_db().clone(); // Clone for async use

        let record_node = RecordNode::from_db(&db, self.node_id).await?;
        use crate::db::entity::node::record::Column as NodeColumn;
        record_node
            .modify(&db, NodeColumn::RecordStatus, i64::from(data.status))
            .await?;
        record_node
            .modify(&db, NodeColumn::RecordScore, data.score)
            .await?;
        let record_edge = RecordEdgeQuery::get_from_record_node_id(self.node_id, &db).await?;
        if let Some(record_edge) = record_edge {
            use crate::db::entity::edge::record::Column as EdgeColumn;
            record_edge
                .modify(&db, EdgeColumn::RecordStatus, i64::from(data.status))
                .await?;
            record_edge
                .modify(&db, EdgeColumn::Score, data.score)
                .await?;
        }
        Ok(())
    }

    pub async fn set_url(&self, db: &DatabaseConnection, url: &str) -> Result<()> {
        let record_node = RecordNode::from_db(db, self.node_id).await?;
        use crate::db::entity::node::record::Column as NodeColumn;
        record_node
            .modify(db, NodeColumn::RecordUrl, Some(url))
            .await?;
        Ok(())
    }

    pub async fn status(
        &self,
        store: &mut impl ModelStore,
        statement_id: i64,
        force_refresh: bool,
    ) -> Result<SubtaskUserRecord> {
        let db = store.get_db().clone();
        let redis = store.get_redis();

        let record_edges = JudgeEdgeQuery::get_u_for_all(self.node_id, &db).await?;
        log::trace!(
            "Fetched {:?} socket edges for record_id {}",
            record_edges,
            self.node_id
        );

        for edge in record_edges {
            let record = SubtaskUserRecord {
                time: edge.time,
                memory: edge.memory,
                status: edge.status.into(),
                score: edge.score,
                subtask_status: vec![],
            };
            log::trace!(
                "Caching testcase edge data: graph_node_{}_{} with data {:?}",
                edge.u,
                edge.v,
                record
            );
            redis
                .set_ex(
                    format!("graph_node_{}_{}", edge.u, edge.v),
                    serde_json::to_string(&record).unwrap(),
                    60,
                )
                .unwrap();
        }
        let get_rt = TestcaseEdgeQuery::get_v_one(statement_id, &db).await?;
        let mut q = queue::Queue::new();
        let _ = q.queue(get_rt);
        log::debug!("Processing queue length: {get_rt}");
        while !q.is_empty() {
            let t = q.dequeue().unwrap();
            // check redis have node_{t} data.
            let data = redis.get(format!("graph_edge_testcase_{t}_v"))?;
            let edges = if let Some(data) = data
                && !data.is_empty()
                && !force_refresh
            {
                data.split(".")
                    .map(|v| v.parse::<i64>().unwrap_or(0))
                    .collect::<Vec<i64>>()
            } else {
                let data = TestcaseEdgeQuery::get_order_asc(t, &db).await?;
                redis.set(
                    format!("graph_edge_testcase_{t}_v"),
                    data.iter()
                        .map(|v| v.to_string())
                        .collect::<Vec<String>>()
                        .join("."),
                )?;
                data
            };
            if !redis.exists(format!("graph_node_{t}"))? || force_refresh {
                log::trace!("Caching testcase node {t}");
                if !edges.is_empty() {
                    log::trace!("Caching subtask node {t}");
                    redis.set(
                        format!("graph_node_{t}"),
                        serde_json::to_string(&SubtaskNode::from_db(&db, t).await?).unwrap(),
                    )?;
                }
            }
            log::trace!("Processing node {t} with edges: {:?}", edges);
            for ver in edges {
                let _ = q.queue(ver);
            }
        }
        log::trace!("Record status processing done");
        let res = Self::get_record_status_with_now_id(redis, self.node_id, get_rt, get_rt)?;

        if force_refresh {
            self.update_root_status(
                store,
                UpdateRecordRootStatusData {
                    record_id: self.node_id,
                    time: res.time,
                    memory: res.memory,
                    status: res.status,
                    score: res.score,
                },
            )
            .await?;
        }

        Ok(res)
    }

    pub async fn status_by_id(&self, store: &mut impl ModelStore) -> Result<SubtaskUserRecord> {
        let db = store.get_db().clone();
        let statement_id = RecordEdgeQuery::get_from_record_node_id(self.node_id, &db).await?;
        if statement_id.is_none() {
            return Err(CoreError::NotFound(
                "Statement ID for record not found".to_string(),
            ));
        }
        self.status(store, statement_id.unwrap().v, false).await
    }

    pub async fn update_remote_status(
        &self,
        store: &mut impl ModelStore,
        statement_id: i64,
        detail_data: HashMap<String, SubtaskUserRecord>,
    ) -> Result<SubtaskUserRecord> {
        log::debug!("Update record status no_subtask_remote_judge");
        let db = store.get_db().clone();

        let root_testcase_id = Subtask::root_id(store, statement_id).await?;

        log::debug!(
            "Updating record {} status for statement {} with testcase root {}",
            self.node_id,
            statement_id,
            root_testcase_id
        );
        let testcase_list = TestcaseEdgeQuery::get_v_filter_extend_content::<SimpleExpr>(
            root_testcase_id,
            vec![],
            &db,
            None,
            None,
        )
        .await?;
        let mut unused_data = detail_data.clone();
        let mut now_max_id = 0;
        for testcase in testcase_list {
            // get_node
            let testcase_node = TestcaseNode::from_db(&db, testcase.v).await?;
            let id = testcase_node.public.testcase_name;
            use crate::db::entity::edge::judge::{ActiveModel, Column};
            log::debug!("Processing testcase {} for record {}", id, self.node_id);
            let edge_exist = JudgeEdgeQuery::get_v_one_filter_extend(
                testcase_node.node_id,
                Column::VNodeId.eq(self.node_id),
                &db,
            )
            .await;
            let nv = detail_data.get(&id);
            log::debug!(
                "Processing testcase {}: existing edges: {:?}, new value: {:?} order: {:?}",
                id,
                edge_exist,
                nv,
                testcase.order
            );
            now_max_id = now_max_id.max(testcase.order);
            if nv.is_none() {
                continue;
            }
            let nv = nv.unwrap().clone();
            unused_data.remove(&id);
            if let Ok(edge_exist) = edge_exist {
                // update note detail.
                log::debug!(
                    "Processing testcase {}: existing edges: {:?}",
                    id,
                    edge_exist
                );
                let new_time = if nv.time >= 0 { Set(nv.time) } else { NotSet };
                let new_memory = if nv.memory >= 0 {
                    Set(nv.memory)
                } else {
                    NotSet
                };
                ActiveModel {
                    edge_id: Set(edge_exist.id),
                    u_node_id: Set(edge_exist.u),
                    v_node_id: Set(edge_exist.v),
                    score: Set(nv.score),
                    status: Set(nv.status.to_string()),
                    time: new_time,
                    memory: new_memory,
                }
                .update(&db)
                .await?;
                continue;
            }
            JudgeEdgeRaw {
                u: testcase_node.node_id,
                v: self.node_id,
                status: nv.status.to_string(),
                time: nv.time,
                memory: nv.memory,
                score: nv.score,
            }
            .save(&db)
            .await?;
        }
        log::debug!("Unused testcase data after processing: {:?}", unused_data);

        if !unused_data.is_empty() {
            store
                .get_redis()
                .del(format!("graph_edge_testcase_{root_testcase_id}_v"))?;
        }

        let mut unused_data: Vec<(String, SubtaskUserRecord)> = unused_data.into_iter().collect();
        unused_data.sort_by(|a, b| a.0.len().cmp(&b.0.len()).then(a.0.cmp(&b.0)));
        log::info!(
            "Creating new testcase nodes for unused data: {:?}",
            unused_data
        );

        for unused in unused_data {
            log::debug!(
                "Unused testcase data for record/statement {}: {:?}, ",
                self.node_id,
                unused
            );
            // create new vjudge testcase node
            let testcase_node = TestcaseNodeRaw {
                public: TestcaseNodePublicRaw {
                    time_limit: -2,
                    memory_limit: -2,
                    testcase_name: unused.0,
                    in_file: 0,
                    out_file: 0,
                },
                private: TestcaseNodePrivateRaw {
                    diff_method: JudgeDiffMethod::RemoteJudge,
                    io_method: JudgeIOMethod::RemoteJudge,
                },
            }
            .save(&db)
            .await?;
            TestcaseEdgeRaw {
                u: root_testcase_id,
                v: testcase_node.node_id,
                order: now_max_id + 1,
            }
            .save(&db)
            .await?;
            now_max_id += 1;
            // create socket edge
            JudgeEdgeRaw {
                u: testcase_node.node_id,
                v: self.node_id,
                status: unused.1.status.to_string(),
                time: unused.1.time,
                memory: unused.1.memory,
                score: unused.1.score,
            }
            .save(&db)
            .await?;
        }
        self.status(store, statement_id, true).await
    }

    fn get_record_status_with_now_id(
        redis: &mut redis::Connection,
        record_id: i64,
        subtask_root_id: i64,
        super_root_id: i64,
    ) -> Result<SubtaskUserRecord> {
        log::debug!(
            "Getting record status for record_id: {}, subtask_root_id: {}, super_root_id: {}",
            record_id,
            subtask_root_id,
            super_root_id
        );
        let now_value = redis
            .get(format!("graph_edge_testcase_{subtask_root_id}_v"))?
            .unwrap_or("".to_string());
        log::trace!("Current value: {}", now_value);
        let now_value = now_value.split(".").collect::<Vec<&str>>();
        let mut now_result = vec![];
        log::trace!("Current value length: {}", now_value.len());
        log::trace!("Record list: {:?}", now_value);
        for value in &now_value {
            let value = value.parse::<i64>().unwrap_or(0);
            if value == 0 {
                continue;
            }
            let result_back =
                Self::get_record_status_with_now_id(redis, record_id, value, super_root_id);
            if let Ok(res) = result_back {
                now_result.push(res);
            }
        }

        if now_result.is_empty() {
            log::debug!(
                "No cached value found, fetching from redis directly for testcase graph_node_{}_{}",
                subtask_root_id,
                record_id
            );
            let result = redis
                .get(format!("graph_node_{subtask_root_id}_{record_id}"))?
                .unwrap_or("".to_string());
            let result = serde_json::from_str::<SubtaskUserRecord>(&result);
            log::trace!("Result for testcase {}: {:?}", subtask_root_id, result);
            if let Ok(res) = result {
                return Ok(res);
            }
            return Ok(SubtaskUserRecord {
                time: 0,
                memory: 0,
                status: RecordStatus::Skipped,
                score: 0,
                subtask_status: vec![],
            });
        }

        log::trace!("Now result before calc: {:?}", now_result);
        log::trace!("Current value: {:?}", now_value);

        let judge_node = redis
            .get(format!("graph_node_{}", subtask_root_id))?
            .unwrap_or("".to_string());
        let judge_node = serde_json::from_str::<SubtaskNode>(&judge_node);
        if let Err(err) = judge_node {
            return Ok(SubtaskUserRecord {
                time: 0,
                memory: 0,
                status: RecordStatus::UnknownError,
                score: (&err.conv::<CoreError>()).into(),
                subtask_status: now_result,
            });
        }

        let raw_data = now_result.clone();
        let now_result = now_result
            .iter()
            .map(|v| (v.score as f64, v.time, v.memory, v.status))
            .collect();
        let judge_node = judge_node.unwrap();
        if let Ok((score, time, memory, status)) = handle_score(
            judge_node.public.subtask_calc_method,
            judge_node.private.subtask_calc_function,
            now_result,
        ) {
            Ok(SubtaskUserRecord {
                time,
                memory,
                status,
                score: score as i64,
                subtask_status: raw_data,
            })
        } else {
            log::error!(
                "Error calculating score for record_id: {}, subtask_root_id: {}",
                record_id,
                subtask_root_id
            );
            Ok(SubtaskUserRecord {
                time: 0,
                memory: 0,
                status: RecordStatus::UnknownError,
                score: 0,
                subtask_status: raw_data,
            })
        }
    }
}

pub struct Subtask;

impl Subtask {
    pub async fn create(db: &DatabaseConnection, statement_id: i64) -> Result<SubtaskNode> {
        let subtask_node = SubtaskNodeRaw {
            public: SubtaskNodePublicRaw {
                subtask_id: 0,
                time_limit: 0,
                memory_limit: 0,
                subtask_calc_method: SubtaskCalcMethod::Sum,
                is_root: true,
            },
            private: SubtaskNodePrivateRaw {
                subtask_calc_function: None,
            },
        }
        .save(db)
        .await?;
        let _ = TestcaseEdgeRaw {
            u: statement_id,
            v: subtask_node.node_id,
            order: 0,
        }
        .save(db)
        .await?;
        Ok(subtask_node)
    }

    pub async fn root_id(store: &mut impl ModelStore, statement_id: i64) -> Result<i64> {
        let db = store.get_db().clone();
        let subtask_id = TestcaseEdgeQuery::get_v_one(statement_id, &db).await?;
        Ok(subtask_id)
    }
}

// Record Search and Query structures
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct RecordListQuery {
    pub page: Option<u64>,
    pub per_page: Option<u64>,
    pub user: Option<String>,
    pub problem: Option<String>,
    pub status: Option<i64>,
    pub platform: Option<String>,
}

#[derive(Ord, PartialOrd, Eq, PartialEq, Clone)]
pub struct RecordSearchResult {
    pub node_id: i64,
}

impl Into<i64> for RecordSearchResult {
    fn into(self) -> i64 {
        self.node_id
    }
}

impl RecordSearchResult {
    pub fn new(node_id: i64) -> Self {
        Self { node_id }
    }
}

pub struct RecordSearch;

impl RecordSearch {
    pub async fn combine(
        store: &mut impl crate::model::ModelStore,
        query: &RecordListQuery,
    ) -> Result<Vec<RecordSearchResult>> {
        use crate::utils::search::search_combine;
        let mut now_result = vec![];
        let page = (query.per_page.unwrap_or(20), query.page.unwrap_or(1));
        let mut filters = vec![];
        use crate::db::entity::edge::record::Column;
        if let Some(status) = query.status {
            filters.push(Column::RecordStatus.eq(status));
        }
        if let Some(platform) = &query.platform {
            filters.push(Column::Platform.eq(platform));
        }
        if let Some(user) = &query.user {
            let user_id = get_user_by_iden(store.get_db(), user).await?.node_id;
            filters.push(Column::UNodeId.eq(user_id));
        }
        if let Some(problem) = &query.problem {
            let (_, problem_id) = ProblemImport::resolve(store, problem).await?;
            filters.push(Column::VNodeId.eq(problem_id));
        }
        let records = RecordEdgeQuery::get_edges_with_filter(
            filters,
            store.get_db(),
            Some(page.0),
            Some(page.0 * (page.1 - 1)),
        ).await?;
        log::info!("{:?}", records);
        for record in records {
            now_result.push(RecordSearchResult::new(record.record_node_id));
        }
        Ok(now_result)
    }

    pub async fn to_list_items(
        store: &mut impl crate::model::ModelStore,
        records: Vec<RecordSearchResult>,
    ) -> Result<Vec<crate::graph::edge::record::RecordListItem>> {
        use crate::graph::node::problem::ProblemNode;
        use crate::graph::node::user::UserNode;
        use crate::graph::node::Node;
        use crate::service::iden::get_node_id_iden;

        let db = store.get_db().clone();
        let mut items = Vec::with_capacity(records.len());

        for record in records {
            // Get record edge from record_node_id
            let edge_opt = RecordEdgeQuery::get_from_record_node_id(record.node_id, &db).await?;
            
            if let Some(record_edge) = edge_opt {
                let problem_node_id = record_edge.v;
                let node_type = crate::graph::action::get_node_type(&db, problem_node_id)
                    .await
                    .unwrap_or_default();

                let (problem_name, problem_iden) = if node_type == "problem_statement" {
                    let idens = get_node_id_iden(&db, store.get_redis(), problem_node_id)
                        .await
                        .unwrap_or_default();
                    let iden = idens.first().cloned().unwrap_or_else(|| "unknown".to_string());

                    let problem_node_ids = ProblemStatementEdgeQuery::get_u(problem_node_id, &db)
                        .await
                        .unwrap_or_default();

                    let name = if let Some(&p_id) = problem_node_ids.first() {
                        match ProblemNode::from_db(&db, p_id).await {
                            Ok(p) => p.public.name,
                            Err(_) => "Unknown Problem".to_string(),
                        }
                    } else {
                        "Unknown Problem".to_string()
                    };
                    (name, iden)
                } else {
                    let idens = get_node_id_iden(&db, store.get_redis(), problem_node_id)
                        .await
                        .unwrap_or_default();
                    let iden = idens.first().cloned().unwrap_or_else(|| "unknown".to_string());

                    match ProblemNode::from_db(&db, problem_node_id).await {
                        Ok(p) => (p.public.name, iden),
                        Err(_) => ("Unknown Problem".to_string(), iden),
                    }
                };

                let (user_name, user_iden) = match UserNode::from_db(&db, record_edge.u).await {
                    Ok(u) => (u.public.name, u.public.iden),
                    Err(_) => ("Unknown User".to_string(), "unknown".to_string()),
                };

                items.push(crate::graph::edge::record::RecordListItem {
                    edge: record_edge,
                    problem_name,
                    problem_iden,
                    user_name,
                    user_iden,
                });
            }
        }

        Ok(items)
    }
}
