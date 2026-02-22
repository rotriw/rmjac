use sea_orm::{ActiveModelTrait, NotSet, Set};
use sea_orm::DatabaseConnection;
use serde::Serialize;
use crate::action::default::ExistsCheck;
use crate::Result;
use crate::service::event::create_event_total;
use crate::service::save::{Savable, SaveService, Saved};
use crate::service::user::{BasicUserInfo, verified_iden};
use crate::db::entity::edge as entity;
use crate::email::send_verify_email_with_user;
use crate::error::{CoreError, QueryExists};
use crate::service::iden::IdenService;
use crate::model::event::EventParent;

pub async fn register_user<T: Savable + BasicUserInfo + Serialize + Clone>(db: &DatabaseConnection, user_data: T) -> Result<Saved<T>> {
    if let Err(e) = verified_iden(user_data.get_iden()?.as_str(), db).await {
        Err(CoreError::StringError(format!("Invalid iden, Reason: {:?}", e)))?;
    }
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
    create_event_total(&user_data, &vec![user_data.get_iden()?], EventParent::ID(0), db).await?;
    let s = send_verify_email_with_user(&user_data.get_email()?, &user_data.data.get_username()?).await;
    if s.is_err() {
        log::error!("Failed to send verify email to {}, error: {:?}", user_data.get_email()?, s.err());
    }
    Ok(user_data)
}