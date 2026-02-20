use sea_orm::{ActiveModelTrait, DatabaseConnection, NotSet, Set};
use serde::{Deserialize, Serialize};
use crate::model::record::{BasicRecord, Record};
use crate::service::create::CreateWithDB;
use crate::Result;
use crate::service::record::BasicRecordInfo;
use crate::service::save::{Savable, SaveService, Saved};

impl<T: BasicRecordInfo + Serialize + Clone + Savable> CreateWithDB for T {
    async fn create(&self, db: &DatabaseConnection) -> Result<Saved<T>> {
        let data = self.save().await?;
        use crate::db::entity::edge::record::*;
        let total = data.get_total();
        ActiveModel {
            edge_id: NotSet,
            time: Set(total.get_time()),
            memory: Set(total.get_memory()),
            user_id: Set(self.get_user_id()),
            problem_id: Set(self.get_problem_id()),
            code: Set(self.get_code()),
            record_id: Set(data.id),
            status: Set(total.status.clone()),
            language: Set(self.get_language()),
            score: Set(total.into())
        }.save(db).await?;
        Ok(data)
    }
}