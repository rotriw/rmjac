use redis::TypedCommands;
use crate::error::CoreError;
use crate::model::content::Description;
use crate::model::user::User;
use crate::service::save::Saved;
use crate::service::user::{BasicUserInfo, Login, UserVerify, VerifyLogin};
use crate::Result;

impl BasicUserInfo for User {
    fn get_user_id(&self) -> Result<i64> {
        Err(CoreError::GetTargetError("user_id".to_string(), "User".to_string(), "User didn't have user_id, please use Saved data.".to_string()))?
    }

    fn get_username(&self) -> Result<String> {
        Ok(self.name.clone())
    }

    fn get_email(&self) -> Result<String> {
        Ok(self.email.clone())
    }

    fn get_description(&self) -> Result<Description> {
        Ok(self.description.clone())
    }

    fn get_iden(&self) -> Result<String> {
        Ok(self.iden.clone())
    }
}

impl<T: BasicUserInfo> BasicUserInfo for Saved<T> {
    fn get_user_id(&self) -> Result<i64> {
        Ok(self.id)
    }

    fn get_username(&self) -> Result<String> {
        self.data.get_username()
    }

    fn get_email(&self) -> Result<String> {
        self.data.get_email()
    }

    fn get_description(&self) -> Result<Description> {
        self.data.get_description()
    }

    fn get_iden(&self) -> Result<String> {
        self.data.get_iden()
    }
}

impl UserVerify for User {
    fn verify_password(&self, password: &str) -> bool {
        self.password == password
    }
}

impl<T: UserVerify> UserVerify for Saved<T> {
    fn verify_password(&self, password: &str) -> bool {
        self.data.verify_password(password)
    }
}

impl VerifyLogin for Saved<User> {
    fn verify_login(&self, token: &str) -> Result<bool> {
        let mut redis = crate::utils::get_redis_connection();
        let user_id = redis.get(format!("user_token:{}", token))?.ok_or_else(|| CoreError::StringError("Invalid token".to_string()))?.parse::<i64>()?;
        Ok(self.id == user_id)
    }
}