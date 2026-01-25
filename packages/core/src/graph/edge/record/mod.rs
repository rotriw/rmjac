use crate::graph::node::record::RecordStatus;
use sea_orm::ColumnTrait;
use sea_orm::{QueryFilter, QueryOrder};

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct RecordEdge {
    pub id: i64,
    pub u: i64,
    pub v: i64,
    pub record_node_id: i64,
    pub record_status: RecordStatus,
    pub code_length: i64,
    pub score: i64,
    #[ts(type = "string")]
    pub submit_time: chrono::NaiveDateTime,
    pub platform: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct RecordListItem {
    pub edge: RecordEdge,
    pub problem_name: String,
    pub problem_iden: String,
    pub user_name: String,
    pub user_iden: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct RecordEdgeRaw {
    pub u: i64,
    pub v: i64,
    pub record_node_id: i64,
    pub record_status: RecordStatus,
    pub code_length: i64,
    pub score: i64,
    #[ts(type = "string")]
    pub submit_time: chrono::NaiveDateTime,
    pub platform: String,
}

impl EdgeRaw<RecordEdge, Model, ActiveModel> for RecordEdgeRaw {
    fn get_edge_type(&self) -> &str {
        "record"
    }

    fn get_edge_id_column(
        &self,
    ) -> <<ActiveModel as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Column {
        Column::EdgeId
    }

    fn get_u_node_id(&self) -> i64 {
        self.u
    }

    fn get_v_node_id(&self) -> i64 {
        self.v
    }
}

impl From<RecordEdgeRaw> for ActiveModel {
    fn from(raw: RecordEdgeRaw) -> Self {
        use sea_orm::ActiveValue::{NotSet, Set};
        ActiveModel {
            edge_id: NotSet,
            u_node_id: Set(raw.u),
            v_node_id: Set(raw.v),
            record_node_id: Set(raw.record_node_id),
            record_status: Set(raw.record_status.into()),
            code_length: Set(raw.code_length),
            score: Set(raw.score),
            submit_time: Set(raw.submit_time),
            platform: Set(raw.platform),
        }
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct RecordEdgeQuery;

impl Edge<ActiveModel, Model, Entity> for RecordEdge {
    fn get_edge_id(&self) -> i64 {
        self.id
    }
    fn get_u_node_id(&self) -> i64 {
        self.u
    }
    fn get_v_node_id(&self) -> i64 {
        self.v
    }
}

impl EdgeQuery<ActiveModel, Model, Entity, RecordEdge> for RecordEdgeQuery {
    fn get_edge_type() -> &'static str {
        "record"
    }
}

impl RecordEdgeQuery {
    /// 获取用户对特定题目的所有提交记录
    pub async fn get_user_records_for_problem(
        user_id: i64,
        problem_id: i64,
        db: &DatabaseConnection,
    ) -> Result<Vec<RecordEdge>> {
        Ok(Entity::find()
            .filter(Column::UNodeId.eq(user_id))
            .filter(Column::VNodeId.eq(problem_id))
            .order_by_desc(Column::SubmitTime)
            .all(db)
            .await?
            .into_iter()
            .map(|model| model.into())
            .collect())
    }

    /// 获取用户对特定题目的最新提交记录
    pub async fn get_user_latest_record_for_problem(
        user_id: i64,
        problem_id: i64,
        db: &DatabaseConnection,
    ) -> Result<Option<RecordEdge>> {
        let record = Entity::find()
            .filter(Column::UNodeId.eq(user_id))
            .filter(Column::VNodeId.eq(problem_id))
            .order_by_desc(Column::SubmitTime)
            .one(db)
            .await?;
        Ok(record.map(|model| model.into()))
    }

    /// 获取用户对特定题目的最佳成绩记录
    pub async fn get_user_best_record_for_problem(
        user_id: i64,
        problem_id: i64,
        db: &DatabaseConnection,
    ) -> Result<Option<RecordEdge>> {
        let record = Entity::find()
            .filter(Column::UNodeId.eq(user_id))
            .filter(Column::VNodeId.eq(problem_id))
            .filter(Column::RecordStatus.eq(i64::from(RecordStatus::Accepted)))
            .order_by_asc(Column::CodeLength)
            .order_by_desc(Column::Score)
            .one(db)
            .await?;
        Ok(record.map(|model| model.into()))
    }

    /// 获取用户所有通过的题目记录
    pub async fn get_user_accepted_records(
        user_id: i64,
        db: &DatabaseConnection,
    ) -> Result<Vec<RecordEdge>> {
        Ok(Entity::find()
            .filter(Column::UNodeId.eq(user_id))
            .filter(Column::RecordStatus.eq(i64::from(RecordStatus::Accepted)))
            .order_by_desc(Column::SubmitTime)
            .all(db)
            .await?
            .into_iter()
            .map(|model| model.into())
            .collect())
    }

    /// 获取特定题目的所有提交记录
    pub async fn get_problem_records(
        problem_id: i64,
        db: &DatabaseConnection,
    ) -> Result<Vec<RecordEdge>> {
        Ok(Entity::find()
            .filter(Column::VNodeId.eq(problem_id))
            .order_by_desc(Column::SubmitTime)
            .all(db)
            .await?
            .into_iter()
            .map(|model| model.into())
            .collect())
    }

    /// 按平台筛选用户提交记录
    pub async fn get_user_records_by_platform(
        user_id: i64,
        platform: String,
        db: &DatabaseConnection,
    ) -> Result<Vec<RecordEdge>> {
        Ok(Entity::find()
            .filter(Column::UNodeId.eq(user_id))
            .filter(Column::Platform.eq(platform))
            .order_by_desc(Column::SubmitTime)
            .all(db)
            .await?
            .into_iter()
            .map(|model| model.into())
            .collect())
    }

    /// 获取用户在指定时间范围内的提交记录
    pub async fn get_user_records_by_time_range(
        user_id: i64,
        start_time: chrono::NaiveDateTime,
        end_time: chrono::NaiveDateTime,
        db: &DatabaseConnection,
    ) -> Result<Vec<RecordEdge>> {
        Ok(Entity::find()
            .filter(Column::UNodeId.eq(user_id))
            .filter(Column::SubmitTime.between(start_time, end_time))
            .order_by_desc(Column::SubmitTime)
            .all(db)
            .await?
            .into_iter()
            .map(|model| model.into())
            .collect())
    }

    /// 统计用户对特定题目的提交次数
    pub async fn count_user_submissions_for_problem(
        user_id: i64,
        problem_id: i64,
        db: &DatabaseConnection,
    ) -> Result<i64> {
        let count = Entity::find()
            .filter(Column::UNodeId.eq(user_id))
            .filter(Column::VNodeId.eq(problem_id))
            .count(db)
            .await?;
        Ok(count as i64)
    }

    pub async fn get_from_record_node_id(
        record_node_id: i64,
        db: &DatabaseConnection,
    ) -> Result<Option<RecordEdge>> {
        let record = Entity::find()
            .filter(Column::RecordNodeId.eq(record_node_id))
            .one(db)
            .await?;
        Ok(record.map(|model| model.into()))
    }
}

use crate::Result;
use crate::db::entity::edge::record::{ActiveModel, Column, Entity, Model};
use crate::graph::edge::{Edge, EdgeQuery, EdgeRaw};
use sea_orm::{DatabaseConnection, EntityTrait, PaginatorTrait};
use serde::{Deserialize, Serialize};
