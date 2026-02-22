pub mod impled;

use redis::TypedCommands;
use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};
use crate::model::content::Description;
use crate::Result;
use crate::model::user::{Token, User};
use crate::service::event::get_event_with_id;
use crate::service::perm::provider::Manage;
use crate::service::perm::provider::ManagePermService;
use crate::service::save::{SaveService, Saved};
use crate::utils::get_redis_connection;

pub trait BasicUserInfo {
    fn get_user_id(&self) -> Result<i64>;
    fn get_username(&self) -> Result<String>;
    fn get_email(&self) -> Result<String>;
    fn get_description(&self) -> Result<Description>;
    fn get_iden(&self) -> Result<String>;
}

pub trait UserVerify {
    fn verify_password(&self, password: &str) -> bool;
}

pub trait Login {
    fn login(&self, long_token: bool) -> impl Future<Output = Result<Saved<Token>>>;
}


pub trait VerifyLogin {
    fn verify_login(&self, token: &str) -> Result<bool>;
}

impl<T: BasicUserInfo> Login for T {
    async fn login(&self, long_token: bool) -> Result<Saved<Token>> {
        let mut redis = get_redis_connection();
        let token = uuid::Uuid::new_v4().to_string();
        redis.set_ex(format!("user_token:{}", token), self.get_user_id()?, if long_token {
            60 * 60 * 24 * 30
        } else {
            60 * 60 * 24
        })?;
        Token {
            token,
            user_iden: self.get_iden()?,
            user_id: self.get_user_id()?,
        }.save().await
    }
}

pub trait Logout {
    fn logout(&self) -> bool;
}

pub mod from;


/// 账户是否已完成验证。
pub trait Verified {
    fn verified(&self, db: &DatabaseConnection) -> impl Future<Output = Result<()>>;
}

impl Verified for Saved<User> {
    async fn verified(&self, db: &DatabaseConnection) -> Result<()> {
        ManagePermService::add(self.id, default_node!(default_strategy_node), Manage::All, db).await;
        Ok(())
    }
}

#[derive(Clone, Deserialize, Serialize, Debug)]
pub enum IdenError {
    Short,
    TooLong,
    NotAllowedChar,
    CanParseNumber,
    Exist,
    NoAscii,
    IsEvent,
    Reserved
}
use IdenError::*;
use crate::service::user::from::FromUserIden;

pub async fn verified_iden(iden: &str, db: &DatabaseConnection) -> Result<(), IdenError> {
    if iden.len() < 3 {
        Err(Short)?;
    }
    if iden.len() > 18 {
        Err(TooLong)?;
    }
    if iden.parse::<i128>().is_ok() {
        Err(CanParseNumber)?;
    }
    if iden.parse::<f64>().is_ok() {
        Err(CanParseNumber)?;
    }
    if !iden.is_ascii() {
        Err(NoAscii)?;
    }
    if iden.contains(":") {
        Err(NotAllowedChar)?;
    }
    if Saved::<User>::from_user_iden(db, iden).await.is_ok() {
        Err(Exist)?;
    }
    if get_event_with_id(iden).await.is_ok() {
        Err(IsEvent)?;
    }
    let reserved = [
        "default_strategy_node",
        "guest_user_node",
        "admin_user_node",
        "admin",
        "guest",
        "root",
    ];
    if reserved.contains(&iden) {
        Err(Reserved)?;
    }
    Ok(())

}