use sea_orm::{ColumnTrait, Order, QueryOrder};
use sea_orm::{DatabaseConnection, EntityTrait, QueryFilter};
use crate::model::problem::Problem;
use crate::model::record::{JudgeStatus, Record};
use crate::model::user::User;
use crate::service::save::{ManageService, Saved};
use crate::Result;



pub trait QueryRecord {
    fn query_status_submission(&self, db: &DatabaseConnection, status: JudgeStatus) -> impl Future<Output=Result<Vec<Saved<Problem>>>>;
    fn query_problem_submission(&self, db: &DatabaseConnection, problem_id: i64) -> impl Future<Output=Result<Vec<Saved<Record>>>>;

    fn get_max_score(&self, db: &DatabaseConnection, problem_id: i64) -> impl Future<Output=Result<f64>>;
}
impl QueryRecord for Saved<User> {
    async fn query_status_submission(&self, db: &DatabaseConnection, status: JudgeStatus) -> Result<Vec<Saved<Problem>>> {
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

    async fn query_problem_submission(&self, db: &DatabaseConnection, problem_id: i64) -> Result<Vec<Saved<Record>>> {
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
            .one(db).await?;
        if let Some(record) = record {
            Ok(record.score)
        } else {
            Ok(-1.00)
        }
    }
}