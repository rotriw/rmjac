use rmjac_core::now_time;

use crate::{
    env::CONFIG,
    handler::ResultHandler,
    utils::challenge::{self, gen_captcha, gen_verify_captcha},
};
use actix_web::{HttpRequest, Scope, get, post, services, web, HttpMessage};
use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};
use rmjac_core::db::entity::node::user::{get_user_by_email, get_user_by_iden};
use rmjac_core::error::CoreError;
use rmjac_core::model::user::{change_user_password, create_default_user, revoke_all_user_tokens, SimplyUser, UserUpdateProps};
use rmjac_core::utils::get_redis_connection;
use crate::handler::{HandlerError, HttpError};
use crate::handler::HandlerError::Conflict;
use crate::utils::perm::UserAuthCotext;

#[derive(Deserialize)]
pub struct UserIden {
    pub id: String,
}

#[derive(Deserialize, Clone)]
pub struct UserCreaterUserVerify {
    pub challenge_text: String,
    pub challenge_darkmode: String,
    pub challenge_code: String,
    pub challenge_time: i64,
}

#[derive(Deserialize, Clone)]
pub struct UserCreateUser {
    pub iden: String,
    pub name: String,
    pub email: String,
    pub avatar: String,
    pub password: String,
    pub verify: UserCreaterUserVerify,
}

pub struct Register {
    db: DatabaseConnection,
    user_context: Option<UserAuthCotext>,
    req: HttpRequest,
    data: UserCreateUser
}


#[derive(Deserialize)]
pub struct UserBeforeCreate {
    dark_mode: bool,
    email: String,
}

impl Register {
    pub fn entry(req: HttpRequest, db: web::Data<DatabaseConnection>, data: web::Json<UserCreateUser>) -> Self {
        Self {
            db: db.get_ref().clone(),
            user_context: req.extensions().get::<UserAuthCotext>().cloned(),
            req: req.clone(),
            data: data.into_inner()
        }
    }

    pub async fn perm(self) -> ResultHandler<Self> {
        let user = self.data.clone();
        let now = now_time!();
        if now.and_utc().timestamp_millis() - user.verify.challenge_time > 5 * 60 * 1000 {
            return Err(HttpError::HandlerError(Conflict("Captcha has expired".to_string())));
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
            return Err(HttpError::HandlerError(Conflict("Captcha is invalid".to_string())));
        }

        Ok(self)
    }

    pub async fn before_register(req: HttpRequest, path: UserBeforeCreate) -> ResultHandler<String> {
        let (challenge_text, challenge_img) = gen_captcha(path.dark_mode);
        let time = chrono::Utc::now().naive_utc();
        let code = CONFIG.lock().unwrap().secret_challenge_code.clone();
        log::info!("{:?}", req.extensions().get::<UserAuthCotext>());
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

    pub async fn check_iden_exist(
        data: web::Path<UserIden>,
        db: web::Data<DatabaseConnection>,
    ) -> ResultHandler<String> {
        let iden = data.into_inner().id;
        let exists = rmjac_core::model::user::check_iden_exists(&db, iden.as_str()).await?;
        Ok(Json! {
            "exists": exists
        })
    }
    pub async fn exec(self) -> ResultHandler<String> {
        let user = self.data;
        let _res = create_default_user(
            &self.db,
            user.iden.as_str(),
            user.name.as_str(),
            user.email.as_str(),
            user.avatar.as_str(),
            user.password.as_str(),
        ).await?;
        Ok(Json! {
            "message": "User created successfully",
            "user": _res
        })
    }
}

pub struct Login {
    db: DatabaseConnection,
    user_context: Option<UserAuthCotext>,
    req: HttpRequest,

    user: String,
    password: String,
    long_token: bool,
}

#[derive(Deserialize)]
struct LoginProp {
    user: String,
    password: String,
    pub long_token: Option<bool>,
}
impl Login {
    pub fn entry(req: HttpRequest, db: web::Data<DatabaseConnection>, data: web::Json<LoginProp>) -> Self {
        Self {
            db: db.get_ref().clone(),
            user_context: req.extensions().get::<UserAuthCotext>().cloned(),
            req: req.clone(),
            user: data.user.clone(),
            password: data.password.clone(),
            long_token: data.long_token.unwrap_or(false),
        }
    }

    pub async fn exec(self) -> ResultHandler<String> {
        let token_iden = match &self.req.headers().get("User-Agent") {
            Some(_) => {
                "Known Device"
            }
            None => "Unknow Device",
        };
        let mut redis = get_redis_connection();
        let (user, token) = rmjac_core::model::user::user_login(
            &self.db,
            &mut redis,
            &self.user.as_str(),
            &self.password.as_str(),
            token_iden,
            self.long_token
        ).await?;
        Ok(serde_json::to_string(&serde_json::json!({
            "user_id": user.node_id,
            "user_public": user.public,
            "token_public": token.public,
            "token_private": token.private,
        })).unwrap())
    }

}


#[derive(Deserialize)]
pub struct UserUpdateRequest {
    pub user: String,
    pub name: Option<String>,
    pub email: Option<String>,
    pub avatar: Option<String>,
    pub description: Option<String>,
    pub bio: Option<String>,
    pub user_profile_show: Option<String>,
    pub old_password: Option<String>,
    pub new_password: Option<String>,
}

pub struct Manage {
    db: DatabaseConnection,
    user_context: Option<UserAuthCotext>,
    req: HttpRequest,
    user_id: Option<i64>,
    update: UserUpdateRequest,
}


impl Manage {
    pub fn entry_update(req: HttpRequest, db: web::Data<DatabaseConnection>, data: UserUpdateRequest) -> Self {
        Self {
            db: db.get_ref().clone(),
            user_context: req.extensions().get::<UserAuthCotext>().cloned(),
            req: req.clone(),
            user_id: None,
            update: data,
        }
    }
    pub fn entry_down(req: HttpRequest, db: web::Data<DatabaseConnection>, uid: &str) -> Self {
        Self {
            db: db.get_ref().clone(),
            user_context: req.extensions().get::<UserAuthCotext>().cloned(),
            req: req.clone(),
            user_id: None,
            update: UserUpdateRequest {
                user: uid.to_string(),
                name: None,
                email: None,
                avatar: None,
                description: None,
                bio: None,
                user_profile_show: None,
                old_password: None,
                new_password: None,
            },
        }
    }

    pub async fn before(self) -> ResultHandler<Self> {
        let user_id = if let Ok(user_id) = get_user_by_iden(&self.db, &self.update.user).await {
            user_id.node_id
        } else if let Ok(user_id) = get_user_by_email(&self.db, &self.update.user ).await {
            user_id.node_id
        } else if let Ok(user_id) = &self.update.user.parse::<i64>() {
            *user_id
        } else {
            return Err(HttpError::CoreError(CoreError::UserNotFound));
        };
        let mut _res = self;
        _res.user_id = Some(user_id);
        Ok(_res)
    }

    #[allow(clippy::collapsible_if)]
    pub async fn perm(self) -> ResultHandler<Self> {
        if let Some(uc) = &self.user_context && uc.is_real && let Some(uid) = self.user_id {
            if uc.user_id == uid {
                return Ok(self);
            }
            // check super
        }
        // check old password is correct or check auth is correct!! todo
        Err(HttpError::HandlerError(HandlerError::PermissionDenied))
    }

    pub async fn update(self) -> ResultHandler<String> {
        let update_form = UserUpdateProps {
            name: self.update.name.clone(),
            email: self.update.email.clone(),
            avatar: self.update.avatar.clone(),
            description: self.update.description.clone(),
            bio: self.update.bio.clone(),
            user_profile_show: self.update.user_profile_show.clone(),
        };
        let common_res = rmjac_core::model::user::change_user_config(
            &self.db,
            self.user_id.unwrap(),
            update_form,
        ).await?;
        let password_res = if self.update.new_password.is_some() { // change user password
            change_user_password(&self.db, self.user_id.unwrap(), self.update.new_password.unwrap()).await.ok()
        } else {
            None
        };
        Ok(Json! {
            "message": "successful",
            "user": common_res.public,
            "password_changed": password_res
        })
    }

    pub async fn down_all(self) -> ResultHandler<String> {
        // user down
        revoke_all_user_tokens(&self.db, self.user_id.unwrap()).await?;
        Ok(Json! {
            "message": "user tokens have been revoked"
        })
    }

}

#[get("/check_iden/{id}")]
pub async fn get_check_iden(
    data: web::Path<UserIden>,
    db: web::Data<DatabaseConnection>,
) -> ResultHandler<String> {
    Register::check_iden_exist(data, db).await
}

#[post("/register")]
pub async fn post_register(
    req: HttpRequest,
    db: web::Data<DatabaseConnection>,
    data: web::Json<UserCreateUser>,
) -> ResultHandler<String> {
    Register::entry(req, db, data).perm().await?.exec().await
}

#[get("/before_create")]
pub async fn before_create(
    req: HttpRequest,
    db: web::Data<DatabaseConnection>,
    data: web::Query<UserBeforeCreate>,
) -> ResultHandler<String> {
    Register::before_register(req, data.into_inner()).await
}

#[post("/login")]
pub async fn post_login(
    req: HttpRequest,
    data: web::Json<LoginProp>,
    db: web::Data<DatabaseConnection>,
) -> ResultHandler<String> {
    Login::entry(req, db, data).exec().await
}

#[post("/logout/{user}")]
pub async fn post_logout(
    req: HttpRequest,
    db: web::Data<DatabaseConnection>,
    path: web::Path<String>,
) -> ResultHandler<String> {
    let user = path.into_inner();
    Manage::entry_down(req, db, &user).before().await?.perm().await?.down_all().await
}

#[post("/manage")]
pub async fn post_manage(
    req: HttpRequest,
    db: web::Data<DatabaseConnection>,
    data: web::Json<UserUpdateRequest>,
) -> ResultHandler<String> {
    Manage::entry_update(req, db, data.into_inner()).before().await?.perm().await?.update().await
}

#[derive(Deserialize)]
pub struct SidebarQuery {
    pub path: String,
}

#[derive(Serialize)]
pub struct SidebarItem {
    pub title: String,
    pub url: String,
    pub show: Option<String>,
    pub reg: Option<String>,
    pub icon: String,
    pub number: Option<i64>,
}

#[get("/sidebar")]
pub async fn get_sidebar(req: HttpRequest, db: web::Data<DatabaseConnection>, page: web::Query<SidebarQuery>) -> ResultHandler<String> {
    let user_context = req.extensions().get::<UserAuthCotext>().cloned();
    let basic_sidebar = vec![
        SidebarItem {
            title: "主页".to_string(),
            url: "/".to_string(),
            show: None,
            reg: None,
            icon: "Home".to_string(),
            number: None,
        },
        SidebarItem {
            title: "题单".to_string(),
            url: "/training".to_string(),
            show: None,
            reg: None,
            icon: "ClipboardCheckIcon".to_string(),
            number: None,
        },
        SidebarItem {
            title: "用户详情".to_string(),
            url: "[current]".to_string(),
            show: Some("/user/.*".to_string()),
            reg: Some("/user/.*".to_string()),
            icon: "User2".to_string(),
            number: None,
        },
        SidebarItem {
            title: "题目详情".to_string(),
            url: "[current]".to_string(),
            show: Some("/problem/.*".to_string()),
            reg: Some("/problem/.*".to_string()),
            icon: "BookMinusIcon".to_string(),
            number: None,
        },
        SidebarItem {
            title: "训练详情".to_string(),
            url: "[current]".to_string(),
            show: Some("/training/.*".to_string()),
            reg: Some("/training/.*".to_string()),
            icon: "BookMinusIcon".to_string(),
            number: None,
        },
    ];
    if let Some(uc) = user_context && uc.is_real {
        // require logout
        let mut log_out = basic_sidebar;
        log_out.push(SidebarItem {
            title: "登出".to_string(),
            url: "/logout".to_string(),
            show: None,
            reg: None,
            icon: "LogOut".to_string(),
            number: None,
        });
        Ok(Json! {
            "is_login": true,
            "user": SimplyUser::from_db(&db, uc.user_id).await?,
            "sidebar": log_out
        })
    } else {
        let mut no_login_sidebar = basic_sidebar;
        no_login_sidebar.push(SidebarItem {
            title: "登录/注册".to_string(),
            url: "/login".to_string(),
            show: None,
            reg: None,
            icon: "LogInIcon".to_string(),
            number: None,
        });
        Ok(Json! {
            "is_login": false,
            "sidebar": no_login_sidebar
        })
    }
}

pub fn service() -> Scope {
    let service = services![
        post_register,
        before_create,
        get_check_iden,
        post_login,
        post_logout,
        post_manage,
        get_sidebar
    ];
    web::scope("/api/user").service(service)
}
