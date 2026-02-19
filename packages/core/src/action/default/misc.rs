use sea_orm::{ActiveModelTrait, DatabaseConnection, NotSet, Set};
use crate::Result;
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(i64)]
pub enum MiscType {
    Statement = 1,
}

impl MiscType {
    pub async fn add(&self, db: &DatabaseConnection, from: i64, to: i64) -> Result<()> {
        crate::db::entity::edge::misc::ActiveModel {
            edge_id: NotSet,
            from: Set(from),
            to: Set(to),
            edge_type: Set(*self as i64),
        }.save(db).await?;
        Ok(())
    }
}