use crate::env::CONFIG;
use crate::handler::ResultHandler;
use crate::utils::challenge::{gen_captcha, gen_verify_captcha, verify_captcha};
use macro_handler::{export, generate_handler, handler, perm, route};
use rmjac_core::graph::node::user::UserNode;
use rmjac_core::graph::node::token::TokenNode;
use rmjac_core::model::ModelStore;
use rmjac_core::model::user::{UserAuthService, UserRaw};
use rmjac_core::now_time;
use rmjac_core::utils::get_redis_connection;
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

    use crate::handler::UserAuthCotext;
    use rmjac_core::error::CoreError::StringError;
    use rmjac_core::model::user::UserCreaterUserVerify;
    use crate::handler::HttpError::CoreError;
    use super::*;

    #[export(ensure_verify)]
    async fn before_verify(
        email: &str,
        verify: UserCreaterUserVerify,
    ) -> ResultHandler<bool> {
        let now = now_time!();
        if now.and_utc().timestamp_millis() - verify.challenge_time > 5 * 60 * 1000 {
            Err(CoreError(StringError("Captcha is expired".to_string())))?;

        }
        let res = verify_captcha(
            &verify.challenge_text,
            email,
            verify.challenge_time,
            &CONFIG.lock().unwrap().secret_challenge_code,
            verify.challenge_darkmode == "dark",
            &verify.challenge_code,
        );
        if res == false {
            Err(CoreError(StringError("Invalid captcha".to_string())))?;
        }

        Ok(true)
    }

    #[handler]
    #[route("/register")]
    #[export("message", "user")]
    async fn post_register(
        store: &mut impl ModelStore,
        iden: &str,
        name: &str,
        email: &str,
        avatar: &str,
        password: &str,
        ensure_verify: bool,
    ) -> ResultHandler<(String, UserNode)> {
        let user = UserRaw {
            iden: iden.to_string(),
            name: name.to_string(),
            email: email.to_string(),
            avatar: avatar.to_string(),
            password: password.to_string(),
        }
        .save(store.get_db())
        .await?;
        Ok(("User created successfully".to_string(), user))
    }

    #[handler]
    #[route("/login")]
    #[export("user_id", "user", "token")]
    async fn post_login(
        store: &mut impl ModelStore,
        user: &str,
        password: &str,
        ltoken: Option<bool>,
    ) -> ResultHandler<(i64, UserNode, TokenNode)> {
        let token_iden = "Unknown Device";
        let mut redis = get_redis_connection();
        let (user, token) = UserAuthService::login(
            store.get_db(),
            &mut redis,
            user,
            password,
            token_iden,
            ltoken.unwrap_or(false),
        )
        .await?;
        Ok((user.node_id, user, token))
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
