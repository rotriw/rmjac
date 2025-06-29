use core::now_time;

use crate::{
    env::CONFIG,
    handler::ResultHandler,
    utils::challenge::{self, gen_captcha, gen_verify_captcha},
};
use actix_web::{HttpRequest, Scope, get, post, services, web};
use sea_orm::DatabaseConnection;
use serde::Deserialize;

#[get("/view/{id}")]
pub async fn get_user(_req: HttpRequest) -> ResultHandler<String> {
    Ok("test".to_string())
}

#[derive(Deserialize)]
pub struct UserIden {
    pub id: String,
}

#[get("/check_iden/{id}")]
pub async fn check_iden_exist(
    data: web::Path<UserIden>,
    db: web::Data<DatabaseConnection>,
) -> ResultHandler<String> {
    let iden = data.into_inner().id;
    let exists = core::model::user::check_iden_exists(&db, iden.as_str()).await?;
    Ok(Json! {
        "exists": exists
    })
}

#[derive(Deserialize)]
pub struct UserCreaterUserVerify {
    pub challenge_text: String,
    pub challenge_darkmode: String,
    pub challenge_code: String,
    pub challenge_time: i64,
}

#[derive(Deserialize)]
pub struct UserCreateUser {
    pub iden: String,
    pub name: String,
    pub email: String,
    pub avatar: String,
    pub password: String,
    pub verify: UserCreaterUserVerify,
}

#[post("/create")]
pub async fn create_user(
    data: web::Json<UserCreateUser>,
    db: web::Data<DatabaseConnection>,
) -> ResultHandler<String> {
    let user = data.into_inner();
    // check captcha time
    let now = now_time!();
    if now.and_utc().timestamp_millis() - user.verify.challenge_time > 5 * 60 * 1000 {
        return Ok(Json! {
            "error": "Captcha has expired"
        });
    }
    // verify challenge code
    if !challenge::verify_captcha(
        &user.verify.challenge_text,
        user.email.as_str(),
        user.verify.challenge_time,
        &CONFIG.lock().unwrap().secret_challenge_code,
        user.verify.challenge_darkmode == "dark",
        &user.verify.challenge_code,
    ) {
        return Ok(Json! {
            "error": "Captcha is invalid"
        });
    }
    let res = core::model::user::create_default_user(
        &db,
        user.iden.as_str(),
        user.name.as_str(),
        user.email.as_str(),
        user.avatar.as_str(),
        user.password.as_str(),
    )
    .await?;
    Ok(serde_json::to_string(&res).unwrap())
}

#[derive(Deserialize)]
pub struct UserLogin {
    pub iden: String,
    pub password: String,
    pub long_token: Option<bool>,
}

#[post("/login")]
pub async fn user_login(
    req: HttpRequest,
    data: web::Json<UserLogin>,
    db: web::Data<DatabaseConnection>,
) -> ResultHandler<String> {
    let token_iden = match req.headers().get("User-Agent") {
        Some(_) => {
            // UA Handler.
            "Known Device"
        }
        None => "Unknow Device",
    };
    let (user, token) = core::model::user::user_login(
        &db,
        data.iden.as_str(),
        data.password.as_str(),
        token_iden,
        data.long_token.unwrap_or(false),
    )
    .await?;
    Ok(Json! {
        "user_public": user.public,
        "token_public": token.public,
        "token_private": token.private,
    })
}

#[derive(Deserialize)]
pub struct UserBeforeCreate {
    dark_mode: bool,
    email: String,
}

#[get("/before_create")]
pub async fn before_create(path: web::Query<UserBeforeCreate>) -> ResultHandler<String> {
    let (challenge_text, challenge_img) = gen_captcha(path.dark_mode);
    let time = chrono::Utc::now().naive_utc();
    let code = (*CONFIG.lock().unwrap()).secret_challenge_code.clone();
    let challenge_code = gen_verify_captcha(
        &challenge_text,
        path.email.as_str(),
        &time,
        code.as_str(),
        path.dark_mode,
    );
    Ok(Json! {
        "challenge_code": challenge_img,
        "challenge_verify": challenge_code,
        "challenge_time": time.and_utc().timestamp_millis(),
    })
}

pub fn service() -> Scope {
    let service = services![
        get_user,
        create_user,
        before_create,
        check_iden_exist,
        user_login
    ];
    web::scope("/api/user").service(service)
}
