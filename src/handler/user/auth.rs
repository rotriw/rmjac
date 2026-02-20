use crate::env::CONFIG;
use crate::handler::ResultHandler;
use crate::utils::challenge::{gen_captcha, gen_verify_captcha, verify_captcha};
use macro_handler::{export, generate_handler, handler, perm, route};
use rmjac_core::now_time;
use rmjac_core::service::user::from::FromUserIden;
use rmjac_core::utils::get_redis_connection;
use rmjac_core::service::save::*;
use sea_orm::DatabaseConnection;
use serde::Deserialize;
#[derive(Deserialize)]
pub struct UserBeforeCreate {
    dark_mode: bool,
    email: String,
}

#[derive(Deserialize, Clone)]
pub struct LoginProp {
    user: String,
    password: String,
    pub long_token: Option<bool>,
}

#[generate_handler(route = "/auth", real_path = "/api/user/auth")]
pub mod handler {
    use rmjac_core::email::send_verify_email_with_user;
    use rmjac_core::service::user::from::FromUserEmail;
    use crate::handler::UserAuthCotext;
    use rmjac_core::error::CoreError::StringError;
    use rmjac_core::model::content::{Description, DescriptionType};
    use rmjac_core::model::user::{Token, User};
    use rmjac_core::service::user::{Login, UserVerify, VerifyLogin, verified_iden};
    use rmjac_core::utils::encrypt::encode_password;
    use crate::handler::HttpError::CoreError;
    use super::*;

    #[handler]
    #[export("message")]
    #[route("/check_iden")]
    async fn get_check_iden(db: &DatabaseConnection, iden: &str) -> ResultHandler<String> {
        let user = verified_iden(iden, db).await;
        if user.is_ok() {
            Ok("success".to_string())
        } else {
            Ok(format!("{:?}", user.err().unwrap()))
        }
    }

    #[export(ensure_verify)]
    async fn before_verify(
        email: &str,
        challenge_text: &str,
        challenge_time: i64,
        challenge_code: &str,
        challenge_darkmode: &str,
    ) -> ResultHandler<bool> {
        let now = now_time!();
        if now.and_utc().timestamp_millis() - challenge_time > 5 * 60 * 1000 {
            Err(CoreError(StringError("Captcha is expired".to_string())))?;

        }
        let res = verify_captcha(
            &challenge_text,
            email,
            challenge_time,
            &CONFIG.lock().unwrap().secret_challenge_code,
            challenge_darkmode == "dark",
            &challenge_code,
        );
        if res == false {
            Err(CoreError(StringError("Invalid captcha".to_string())))?;
        }

        Ok(true)
    }

    #[handler]
    #[route("/register")]
    #[export("user")]
    async fn post_register(
        db: &DatabaseConnection,
        iden: &str,
        name: &str,
        email: &str,
        avatar: &str,
        password: &str,
        ensure_verify: bool,
    ) -> ResultHandler<Saved<User>> {
        let data = rmjac_core::action::user::register::register_user(db, User {
            iden: iden.to_string(),
            name: name.to_string(),
            description: Description {
                content: "".to_string(),
                description_type: DescriptionType::Typst
            },
            password: encode_password(password),
            email: email.to_string(),
            avatar: avatar.to_string(),
            creation_time: chrono::Utc::now(),
        }).await?;
        Ok(data)
    }

    #[handler]
    #[route("/login")]
    #[export("user_id", "token")]
    async fn post_login(
        db: &DatabaseConnection,
        user: &str,
        password: &str,
        ltoken: Option<bool>,
    ) -> ResultHandler<(i64, Saved<Token>)> {
        let user_data = Saved::from_user_iden(db, user).await;
        let user = if let Ok(user_data) = user_data {
            user_data
        } else {
            Saved::<User>::from_user_email(db, user).await?
        };
        if !user.verify_password(&encode_password(password)) {
            Err(CoreError(StringError("Invalid detail".to_string())))?;
        }
        let login_data = user.login(ltoken.unwrap_or(false)).await?;
        Ok((user.id, login_data))
    }

    #[handler]
    #[route("/send_verify_email")]
    #[export("message")]
    async fn post_send_email(
        db: &DatabaseConnection,
        user_id: i64,
    ) -> ResultHandler<(String)> {
        let user = Saved::<User>::get(user_id).await?;
        send_verify_email_with_user(&user.data.email, &user.data.name).await?;
        Ok("success".to_string())
    }

    async fn perm() -> bool {
        true
    }

    #[handler]
    #[route("/before_register")]
    #[perm(perm)]
    #[export("challenge_code", "challenge_verify", "challenge_time")]
    async fn get_before_register(
        dark_mode: bool,
        email: &str,
    ) -> ResultHandler<(String, String, i64)> {
        let (challenge_text, challenge_img) = gen_captcha(dark_mode);
        let time = chrono::Utc::now().naive_utc();
        let code = CONFIG.lock().unwrap().secret_challenge_code.clone();
        let challenge_code =
            gen_verify_captcha(&challenge_text, email, &time, code.as_str(), dark_mode);
        Ok((
            challenge_img,
            challenge_code,
            time.and_utc().timestamp_millis(),
        ))
    }
}
