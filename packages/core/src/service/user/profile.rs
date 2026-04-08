use std::collections::HashSet;

use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter};

use crate::{
    db::entity::edge::record,
    model::{record::JudgeStatus, user::User},
    service::{record::query::QueryRecord, save::Saved},
    Result,
};

impl Saved<User> {
    pub async fn get_submit_count(&self, db: &DatabaseConnection) -> Result<i64> {
        let records = record::Entity::find()
            .filter(record::Column::UserId.eq(self.id))
            .all(db)
            .await?;
        Ok(records.len() as i64)
    }

    pub async fn get_accepted_problem_count(&self, db: &DatabaseConnection) -> Result<i64> {
        let accepted = self.query_status_submission(db, JudgeStatus::Accepted).await?;
        let count = accepted
            .into_iter()
            .map(|problem| problem.id)
            .collect::<HashSet<_>>()
            .len() as i64;
        Ok(count)
    }
}
