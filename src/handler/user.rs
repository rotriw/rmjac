use rmjac_core::now_time;

use crate::{
    env::CONFIG,
    handler::{ResultHandler, BasicHandler, HandlerError, HttpError},
    utils::challenge::{self, gen_captcha, gen_verify_captcha},
    utils::perm::UserAuthCotext,
};
use actix_web::{HttpRequest, Scope, get, services, web, HttpMessage};
use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};
use tap::Conv;
use rmjac_core::db::entity::node::user::{get_user_by_email, get_user_by_iden};
use rmjac_core::error::CoreError;
use rmjac_core::model::user::{User, UserAuthService, SimplyUser, UserRaw, UserUpdateProps};
use rmjac_core::utils::get_redis_connection;
use crate::handler::HandlerError::Conflict;
use macro_handler::{generate_handler, handler, from_path, export, perm, route};

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

impl From<UserCreateUser> for UserRaw {
    fn from(value: UserCreateUser) -> Self {
        Self {
            iden: value.iden,
            password: value.password,
            email: value.email,
            avatar: value.avatar,
            name: value.name
        }
    }
}

#[derive(Deserialize)]
pub struct UserBeforeCreate {
    dark_mode: bool,
    email: String,
}

#[derive(Deserialize, Clone)]
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

#[derive(Deserialize, Clone)]
pub struct LoginProp {
    user: String,
    password: String,
    pub long_token: Option<bool>,
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

// Register Handler
#[generate_handler]
mod register {
    use super::*;

    #[handler("/api/user")]
    pub struct Register {
        basic: BasicHandler,
    }

    impl Register {
        /// Verify the captcha challenge
        async fn verify_challenge(data: &UserCreateUser) -> Result<(), HttpError> {
            let now = now_time!();
            if now.and_utc().timestamp_millis() - data.verify.challenge_time > 5 * 60 * 1000 {
                return Err(HttpError::HandlerError(Conflict("Captcha has expired".to_string())));
            }
            
            if !challenge::verify_captcha(
                &data.verify.challenge_text,
                data.email.as_str(),
                data.verify.challenge_time,
                &CONFIG.lock().unwrap().secret_challenge_code,
                data.verify.challenge_darkmode == "dark",
                &data.verify.challenge_code,
            ) {
                return Err(HttpError::HandlerError(Conflict("Captcha is invalid".to_string())));
            }
            
            Ok(())
        }

        #[perm]
        async fn check_register_perm(&self, data: &UserCreateUser) -> bool {
            Self::verify_challenge(data).await.is_ok()
        }

        #[handler]
        #[route("/register")]
        async fn post_register(&self, data: UserCreateUser) -> ResultHandler<String> {
            let user = data.conv::<UserRaw>().save(&self.basic.db).await?;
            Ok(Json! {
                "message": "User created successfully",
                "user": user
            })
        }
    }
}

// Login Handler
#[generate_handler]
mod login {
    use super::*;

    #[handler("/api/user")]
    pub struct Login {
        basic: BasicHandler,
    }

    impl Login {
        /// Get device identifier from User-Agent header
        fn get_device_identifier(req: &HttpRequest) -> &'static str {
            match req.headers().get("User-Agent") {
                Some(_) => "Known Device",
                None => "Unknown Device",
            }
        }

        #[handler]
        #[route("/login")]
        async fn post_login(&self, data: LoginProp) -> ResultHandler<String> {
            let token_iden = Self::get_device_identifier(&self.basic.req);
            let mut redis = get_redis_connection();
            
            let (user, token) = UserAuthService::login(
                &self.basic.db,
                &mut redis,
                data.user.as_str(),
                data.password.as_str(),
                token_iden,
                data.long_token.unwrap_or(false)
            ).await?;
            
            Ok(serde_json::to_string(&serde_json::json!({
                "user_id": user.node_id,
                "user_public": user.public,
                "token_public": token.public,
                "token_private": token.private,
            })).unwrap())
        }
    }
}

// Manage Handler
#[generate_handler]
mod manage {
    use super::*;

    #[handler("/manage")]
    pub struct Manage {
        basic: BasicHandler,
    }

    impl Manage {
        /// Resolve user identifier to user ID
        async fn resolve_user_id(db: &DatabaseConnection, user_iden: &str) -> Result<i64, HttpError> {
            if let Ok(user) = get_user_by_iden(db, user_iden).await {
                return Ok(user.node_id);
            }
            if let Ok(user) = get_user_by_email(db, user_iden).await {
                return Ok(user.node_id);
            }
            if let Ok(user_id) = user_iden.parse::<i64>() {
                return Ok(user_id);
            }
            Err(HttpError::CoreError(CoreError::UserNotFound))
        }

        #[perm]
        async fn check_manage_perm(&self, user_id: &i64) -> bool {
            if let Some(uc) = &self.basic.user_context
                && uc.is_real && uc.user_id == *user_id {
                return true;
            }
            false
        }

        #[handler]
        #[route("/update")]
        async fn post_manage(&self, data: UserUpdateRequest) -> ResultHandler<String> {
            let user_id = Self::resolve_user_id(&self.basic.db, &data.user).await?;
            
            // 权限检查
            if !self.check_manage_perm(&user_id).await {
                return Err(HttpError::HandlerError(HandlerError::PermissionDenied));
            }
            
            let update_form = UserUpdateProps {
                name: data.name.clone(),
                email: data.email.clone(),
                avatar: data.avatar.clone(),
                description: data.description.clone(),
                bio: data.bio.clone(),
                user_profile_show: data.user_profile_show.clone(),
            };
            let user = User::new(user_id);
            let common_res = user.update_config(&self.basic.db, update_form).await?;
            let password_res = if let Some(new_password) = data.new_password {
                user.change_password(&self.basic.db, new_password).await.ok()
            } else {
                None
            };
            Ok(Json! {
                "message": "successful",
                "user": common_res.public,
                "password_changed": password_res
            })
        }

        #[from_path(user_iden)]
        #[export(user_id)]
        async fn before_resolve_logout_user(&self, user_iden: &str) -> ResultHandler<i64> {
            Self::resolve_user_id(&self.basic.db, user_iden).await
        }

        #[handler]
        #[route("/logout/{user_iden}")]
        async fn post_logout(&self, user_id: i64) -> ResultHandler<String> {
            let user = User::new(user_id);
            user.revoke_all_tokens(&self.basic.db).await?;
            Ok(Json! {
                "message": "user tokens have been revoked"
            })
        }
    }
}

// Profile Handler
#[generate_handler]
mod profile {
    use super::*;

    #[handler("/api/user")]
    pub struct Profile {
        basic: BasicHandler,
    }

    impl Profile {
        /// Resolve user identifier to user ID
        async fn resolve_user_id(db: &DatabaseConnection, iden: &str) -> Result<i64, HttpError> {
            if let Ok(user) = get_user_by_iden(db, iden).await {
                return Ok(user.node_id);
            }
            if let Ok(user) = get_user_by_email(db, iden).await {
                return Ok(user.node_id);
            }
            if let Ok(uid) = iden.parse::<i64>() {
                return Ok(uid);
            }
            Err(HttpError::CoreError(CoreError::UserNotFound))
        }

        #[from_path(iden)]
        #[export(user_id)]
        async fn before_resolve_user(&self, iden: &str) -> ResultHandler<i64> {
            Self::resolve_user_id(&self.basic.db, iden).await
        }

        #[handler]
        #[route("/profile/{iden}")]
        async fn get_profile(&self, user_id: i64) -> ResultHandler<String> {
            let user = SimplyUser::load(&self.basic.db, user_id).await?;
            Ok(Json! {
                "user": user
            })
        }
    }
}

// Static utility functions
pub async fn before_register(_req: HttpRequest, path: UserBeforeCreate) -> ResultHandler<String> {
    let (challenge_text, challenge_img) = gen_captcha(path.dark_mode);
    let time = chrono::Utc::now().naive_utc();
    let code = CONFIG.lock().unwrap().secret_challenge_code.clone();
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
    let exists = User::identifier_exists(&db, iden.as_str()).await?;
    Ok(Json! {
        "exists": exists
    })
}

#[get("/check_iden/{id}")]
pub async fn get_check_iden(
    data: web::Path<UserIden>,
    db: web::Data<DatabaseConnection>,
) -> ResultHandler<String> {
    check_iden_exist(data, db).await
}

#[get("/before_create")]
pub async fn before_create(
    req: HttpRequest,
    _db: web::Data<DatabaseConnection>,
    data: web::Query<UserBeforeCreate>,
) -> ResultHandler<String> {
    before_register(req, data.into_inner()).await
}

#[get("/info")]
pub async fn get_user_info(req: HttpRequest, db: web::Data<DatabaseConnection>) -> ResultHandler<String> {
    let user_context = req.extensions().get::<UserAuthCotext>().cloned();
    if let Some(uc) = user_context && uc.is_real {
        let user = SimplyUser::load(&db, uc.user_id).await?;
        Ok(Json! {
            "is_login": true,
            "user": user
        })
    } else {
        Ok(Json! {
            "is_login": false
        })
    }
}

#[get("/sidebar")]
pub async fn get_sidebar(req: HttpRequest, db: web::Data<DatabaseConnection>, _page: web::Query<SidebarQuery>) -> ResultHandler<String> {
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
        let mut log_out = basic_sidebar;
        log_out.push(SidebarItem {
                title: "我的记录".to_string(),
                url: "/record".to_string(),
                show: None,
                reg: None,
                icon: "DiscIcon".to_string(),
                number: None,
        });
        log_out.push(SidebarItem {
            title: "Vjudge 服务".to_string(),
            url: "/vjudge/account".to_string(),
            show: None,
            reg: None,
            icon: "Cloud".to_string(),
            number: None,
        });
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
            "user": SimplyUser::load(&db, uc.user_id).await?,
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
        get_check_iden,
        before_create,
        get_user_info,
        get_sidebar,
    ];
    web::scope("/api/user")
        .service(service)
        .service(register::Register::export_http_service())
        .service(login::Login::export_http_service())
        .service(manage::Manage::export_http_service())
        .service(profile::Profile::export_http_service())
}
