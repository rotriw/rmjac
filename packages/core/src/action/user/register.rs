use sea_orm::{ActiveModelTrait, ColumnTrait, NotSet, Set};
use sea_orm::QueryFilter;
use sea_orm::{DatabaseConnection, EntityTrait};
use serde::Serialize;
use crate::action::default::ExistsCheck;
use crate::Result;
use crate::service::save::{Savable, SaveService, Saved};
use crate::service::user::BasicUserInfo;
use crate::db::entity::edge as entity;
use crate::email::send_verify_email_with_user;
use crate::error::{CoreError, QueryExists};
use crate::service::iden::IdenService;

pub async fn register_user<T: Savable + BasicUserInfo + Serialize + Clone>(db: &DatabaseConnection, user_data: T) -> Result<Saved<T>> {
    if entity::user::Model::exists_for_str(db, "email", user_data.get_email()?).await? {
        Err(CoreError::QueryExists(QueryExists::RegisterEmailExist))?;
    }
    if entity::user::Model::exists_for_str(db, "user_iden", user_data.get_username()?).await? {
        Err(CoreError::QueryExists(QueryExists::RegisterIDENExist))?;
    }
    let user_data = user_data.save().await?;
    entity::user::ActiveModel {
        edge_id: NotSet,
        user_iden: Set(user_data.get_iden()?),
        user_id: Set(user_data.get_user_id()?),
        email: Set(user_data.get_email()?),
    }.save(db).await?;
    user_data.set_iden(user_data.get_iden()?.as_str());
    let _ = send_verify_email_with_user(&user_data.get_email()?, &user_data.data.get_username()?).await;
    Ok(user_data)
}