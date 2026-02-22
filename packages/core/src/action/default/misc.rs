use sea_orm::{IntoActiveModel, QueryFilter};
use sea_orm::ColumnTrait;
use sea_orm::{ActiveModelTrait, DatabaseConnection, EntityTrait, NotSet, Set};
use crate::Result;
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(i64)]
pub enum MiscType {
    Statement = 1,
    Order = 2,
    Event = 3,
    EventProblem = 4,
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

    pub async fn get_next_list(&self, db: &DatabaseConnection, from: i64) -> Result<Vec<i64>> {
        let edges = crate::db::entity::edge::misc::Entity::find()
            .filter(crate::db::entity::edge::misc::Column::From.eq(from))
            .filter(crate::db::entity::edge::misc::Column::EdgeType.eq(*self as i64))
            .all(db).await?;
        Ok(edges.into_iter().map(|e| e.to).collect())
    }

    // if f(from, to) == true, then delete.
    pub async fn remove_with_fn<F: Fn(i64, i64) -> bool>(&self, db: &DatabaseConnection, from: i64, check_remove: F) -> Result<()> {
        let edges = crate::db::entity::edge::misc::Entity::find()
            .filter(crate::db::entity::edge::misc::Column::From.eq(from))
            .filter(crate::db::entity::edge::misc::Column::EdgeType.eq(*self as i64))
            .all(db).await?;
        for edge in edges {
            if check_remove(edge.from, edge.to) {
                edge.into_active_model().delete(db).await?;
            }
        }
        Ok(())
    }

}