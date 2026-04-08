use crate::Result;
use crate::model::event::EventIden;
use crate::model::problem::Problem;
use crate::model::record::{BasicRecord, JudgeStatus, Record};
use crate::model::user::{DisplayUser, User};
use crate::service::event::get_event_with_id;
use crate::service::save::{ManageService, Saved};
use rand::TryRngCore;
use sea_orm::{ColumnTrait, Order, QueryOrder, QuerySelect};
use sea_orm::{DatabaseConnection, EntityTrait, QueryFilter};
use serde::{Deserialize, Serialize};

pub trait QueryRecord {
    fn query_status_submission(
        &self,
        db: &DatabaseConnection,
        status: JudgeStatus,
    ) -> impl Future<Output = Result<Vec<Saved<Problem>>>>;
    fn query_problem_submission(
        &self,
        db: &DatabaseConnection,
        problem_id: i64,
    ) -> impl Future<Output = Result<Vec<Saved<Record>>>>;

    fn get_max_score(
        &self,
        db: &DatabaseConnection,
        problem_id: i64,
    ) -> impl Future<Output = Result<f64>>;
}

pub trait QueryTraining {
    fn get_training_submission(
        &self,
        db: &DatabaseConnection,
        training_id: i64,
    ) -> impl Future<Output = Result<Vec<Saved<Record>>>>;
}

impl QueryRecord for Saved<User> {
    async fn query_status_submission(
        &self,
        db: &DatabaseConnection,
        status: JudgeStatus,
    ) -> Result<Vec<Saved<Problem>>> {
        use crate::db::entity::edge::record::*;
        let records = Entity::find()
            .filter(Column::UserId.eq(self.id))
            .filter(Column::Status.eq(status))
            .all(db)
            .await?;
        let mut res = vec![];
        for record in records {
            res.push(Saved::get(record.problem_id).await?);
        }
        Ok(res)
    }

    async fn query_problem_submission(
        &self,
        db: &DatabaseConnection,
        problem_id: i64,
    ) -> Result<Vec<Saved<Record>>> {
        use crate::db::entity::edge::record::*;
        let records = Entity::find()
            .filter(Column::UserId.eq(self.id))
            .filter(Column::ProblemId.eq(problem_id))
            .all(db)
            .await?;
        let mut res = vec![];
        for record in records {
            res.push(Saved::get(record.record_id).await?);
        }
        Ok(res)
    }

    async fn get_max_score(&self, db: &DatabaseConnection, problem_id: i64) -> Result<f64> {
        use crate::db::entity::edge::record::*;
        let record = Entity::find()
            .filter(Column::UserId.eq(self.id))
            .filter(Column::ProblemId.eq(problem_id))
            .order_by(Column::Score, Order::Desc)
            .one(db)
            .await?;
        if let Some(record) = record {
            Ok(record.score)
        } else {
            Ok(-1.00)
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize, ts_rs::TS)]
#[ts(export)]
pub struct QueryResult {
    pub user: Saved<DisplayUser>,
    pub problem: EventIden<Problem>,
    pub record: Saved<BasicRecord>,
}

impl QueryResult {
    pub fn new(
        user: &Saved<User>,
        problem: &EventIden<Problem>,
        record: &Saved<BasicRecord>,
    ) -> Self {
        Self {
            user: user.map(),
            problem: problem.clone(),
            record: record.clone(),
        }
    }
}

pub async fn query_global(
    db: &DatabaseConnection,
    problem_status: Option<JudgeStatus>,
    problem_iden: Option<&str>,
    uid: Option<i64>,
    offset: u64,
    show: u64,
) -> Result<Vec<QueryResult>> {
    use crate::db::entity::edge::record::*;
    let mut query = Entity::find();
    if let Some(iden) = problem_iden {
        let id = get_event_with_id(iden).await?;
        query = query.filter(Column::ProblemId.eq(id));
    }
    if let Some(uid) = uid {
        query = query.filter(Column::UserId.eq(uid));
    }
    if let Some(status) = problem_status {
        query = query.filter(Column::Status.eq(status));
    }
    let query_data = query
        .order_by(Column::EdgeId, Order::Desc)
        .offset(offset)
        .limit(show)
        .all(db)
        .await?;
    let mut res = vec![];
    for query in query_data {
        let user = Saved::<User>::get(query.user_id).await?;
        let problem: Saved<Problem> = Saved::get(query.problem_id).await?;
        let record: Saved<BasicRecord> = Saved::get(query.record_id).await?;
        let iden = if let Some(problem_iden) = problem_iden {
            problem_iden.to_string()
        } else {
            problem
                .data
                .sign
                .clone()
                .unwrap_or(format!("ID:{}", problem.id))
        };
        let problem = EventIden {
            id: problem.id,
            iden,
            data: problem.data,
        };
        res.push(QueryResult::new(&user, &problem, &record));
    }
    Ok(res)
}

/// Batch query: for each (user_id, problem_id) pair, return (user_id, problem_id, passed, best_score).
/// This avoids the N+1 query problem when building a tracker table.
pub async fn query_batch_user_problem_status(
    db: &DatabaseConnection,
    user_ids: &[i64],
    problem_ids: &[i64],
) -> Result<Vec<(i64, i64, bool, f64)>> {
    use crate::db::entity::edge::record::*;

    if user_ids.is_empty() || problem_ids.is_empty() {
        return Ok(vec![]);
    }

    let records = Entity::find()
        .filter(Column::UserId.is_in(user_ids.to_vec()))
        .filter(Column::ProblemId.is_in(problem_ids.to_vec()))
        .all(db)
        .await?;

    // Aggregate: group by (user_id, problem_id) → (passed, best_score)
    use std::collections::HashMap;
    let mut agg: HashMap<(i64, i64), (bool, f64)> = HashMap::new();
    for r in records {
        let entry = agg.entry((r.user_id, r.problem_id)).or_insert((false, -1.0));
        if r.status == JudgeStatus::Accepted {
            entry.0 = true;
        }
        if r.score > entry.1 {
            entry.1 = r.score;
        }
    }

    Ok(agg
        .into_iter()
        .map(|((uid, pid), (passed, score))| (uid, pid, passed, score))
        .collect())
}
