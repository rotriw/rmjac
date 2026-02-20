use sea_orm::{ColumnTrait, DatabaseConnection};
use sea_orm::{EntityTrait, QueryFilter};
use crate::model::user::User;
use crate::Result;
use crate::service::save::{ManageService, Saved};
use crate::db::entity::edge::user as db_user;
use crate::error::CoreError;

pub trait FromUserIden: Sized {
    fn from_user_iden(db: &DatabaseConnection, iden: &str) -> impl Future<Output = Result<Self>>;
}

impl FromUserIden for Saved<User> {
    async fn from_user_iden(db: &DatabaseConnection, iden: &str) -> Result<Saved<User>> {
        let user = db_user::Entity::find()
            .filter(db_user::Column::UserIden.eq(iden.to_string()))
            .one(db).await?;
        if user.is_none() {
            Err(CoreError::NotFound("user id not found".to_string()))?;
        }
        Saved::get(user.unwrap().user_id).await
    }
}