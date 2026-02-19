pub mod impled;

use redis::TypedCommands;
use crate::Result;
use crate::model::user::Token;
use crate::service::save::{SaveService, Saved};
use crate::utils::get_redis_connection;

pub trait BasicUserInfo {
    fn get_user_id(&self) -> Result<i64>;
    fn get_username(&self) -> Result<String>;
    fn get_email(&self) -> Result<String>;
    fn get_description(&self) -> Result<String>;
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
