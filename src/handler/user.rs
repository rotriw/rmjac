use rmjac_core::now_time;

use crate::{
    env::CONFIG,
    handler::ResultHandler,
    utils::challenge::{self, gen_captcha, gen_verify_captcha},
};
use actix_web::{HttpRequest, Scope, get, post, services, web, HttpMessage};
use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};
use tap::Conv;
use rmjac_core::db::entity::node::user::{get_user_by_email, get_user_by_iden};
use rmjac_core::error::CoreError;
use rmjac_core::model::user::{User, UserAuthService, UserTokenService, SimplyUser, UserRaw, UserUpdateProps};
use rmjac_core::utils::get_redis_connection;
use crate::handler::{BasicHandler, HandlerError, HttpError};
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

pub struct Register {
    db: DatabaseConnection,
    data: UserCreateUser
}

#[derive(Deserialize)]
pub struct UserBeforeCreate {
    dark_mode: bool,
    email: String,
}

impl Register {
    /// Create a new Register handler from HTTP request
    pub fn new(_req: HttpRequest, db: web::Data<DatabaseConnection>, data: web::Json<UserCreateUser>) -> Self {
        Self {
            db: db.get_ref().clone(),
            data: data.into_inner()
        }
    }

    /// Verify the captcha challenge
    async fn verify_challenge(&self) -> Result<(), HttpError> {
        let user = &self.data;
        let now = now_time!();
        if now.and_utc().timestamp_millis() - user.verify.challenge_time > 5 * 60 * 1000 {
            return Err(HttpError::HandlerError(Conflict("Captcha has expired".to_string())));
        }
        
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
        
        Ok(())
    }

    pub async fn perm(self) -> ResultHandler<Self> {
        self.verify_challenge().await?;
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
        let exists = User::identifier_exists(&db, iden.as_str()).await?;
        Ok(Json! {
            "exists": exists
        })
    }

    /// Create a new user and save to database
    pub async fn exec(self) -> ResultHandler<String> {
        let user = self.data.conv::<UserRaw>().save(&self.db).await?;
        Ok(Json! {
            "message": "User created successfully",
            "user": user
        })
    }
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

pub struct Login {
    db: DatabaseConnection,
    req: HttpRequest,
    user: String,
    password: String,
    long_token: bool,
}

#[derive(Deserialize)]
pub struct LoginProp {
    user: String,
    password: String,
    pub long_token: Option<bool>,
}

impl Login {
    /// Create a new Login handler
    pub fn new(req: HttpRequest, db: web::Data<DatabaseConnection>, data: web::Json<LoginProp>) -> Self {
        Self {
            db: db.get_ref().clone(),
            req: req.clone(),
            user: data.user.clone(),
            password: data.password.clone(),
            long_token: data.long_token.unwrap_or(false),
        }
    }

    /// Get device identifier from User-Agent header
    fn get_device_identifier(&self) -> &'static str {
        match self.req.headers().get("User-Agent") {
            Some(_) => "Known Device",
            None => "Unknown Device",
        }
    }

    /// Execute the login operation
    pub async fn exec(self) -> ResultHandler<String> {
        let token_iden = self.get_device_identifier();
        let mut redis = get_redis_connection();
        
        let (user, token) = UserAuthService::login(
            &self.db,
            &mut redis,
            self.user.as_str(),
            self.password.as_str(),
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


pub struct Manage {
    db: DatabaseConnection,
    user_context: Option<UserAuthCotext>,
    user_id: Option<i64>,
    update: UserUpdateRequest,
}

impl Manage {
    /// Create a new Manage handler for updating user
    pub fn new_update(req: HttpRequest, db: web::Data<DatabaseConnection>, data: UserUpdateRequest) -> Self {
        Self {
            db: db.get_ref().clone(),
            user_context: req.extensions().get::<UserAuthCotext>().cloned(),
            user_id: None,
            update: data,
        }
    }

    /// Create a new Manage handler for logout
    pub fn new_logout(req: HttpRequest, db: web::Data<DatabaseConnection>, uid: &str) -> Self {
        Self {
            db: db.get_ref().clone(),
            user_context: req.extensions().get::<UserAuthCotext>().cloned(),
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

    /// Resolve user identifier to user ID
    async fn resolve_user_id(&self) -> Result<i64, HttpError> {
        if let Ok(user) = get_user_by_iden(&self.db, &self.update.user).await {
            return Ok(user.node_id);
        }
        if let Ok(user) = get_user_by_email(&self.db, &self.update.user).await {
            return Ok(user.node_id);
        }
        if let Ok(user_id) = self.update.user.parse::<i64>() {
            return Ok(user_id);
        }
        Err(HttpError::CoreError(CoreError::UserNotFound))
    }

    pub async fn before(mut self) -> ResultHandler<Self> {
        self.user_id = Some(self.resolve_user_id().await?);
        Ok(self)
    }

    /// Check if the current user has permission to perform this operation
    async fn check_permission(&self) -> Result<(), HttpError> {
        if let Some(uc) = &self.user_context {
            if uc.is_real {
                if let Some(uid) = self.user_id {
                    if uc.user_id == uid {
                        return Ok(());
                    }
                }
            }
        }
        Err(HttpError::HandlerError(HandlerError::PermissionDenied))
    }

    pub async fn perm(self) -> ResultHandler<Self> {
        self.check_permission().await?;
        Ok(self)
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
        let user = User::new(self.user_id.unwrap());
        let common_res = user.update_config(&self.db, update_form).await?;
        let password_res = if self.update.new_password.is_some() {
            user.change_password(&self.db, self.update.new_password.unwrap()).await.ok()
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
        let user = User::new(self.user_id.unwrap());
        user.revoke_all_tokens(&self.db).await?;
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
    Register::new(req, db, data).perm().await?.exec().await
}

#[get("/before_create")]
pub async fn before_create(
    req: HttpRequest,
    _db: web::Data<DatabaseConnection>,
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
    Login::new(req, db, data).exec().await
}

#[post("/logout/{user}")]
pub async fn post_logout(
    req: HttpRequest,
    db: web::Data<DatabaseConnection>,
    path: web::Path<String>,
) -> ResultHandler<String> {
    let user = path.into_inner();
    Manage::new_logout(req, db, &user).before().await?.perm().await?.down_all().await
}

#[post("/manage")]
pub async fn post_manage(
    req: HttpRequest,
    db: web::Data<DatabaseConnection>,
    data: web::Json<UserUpdateRequest>,
) -> ResultHandler<String> {
    Manage::new_update(req, db, data.into_inner()).before().await?.perm().await?.update().await
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
        // require logout
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

pub struct Profile {
    basic: BasicHandler,
    iden: String,
    user_id: Option<i64>,
}

impl Profile {
    /// Create a new Profile handler
    pub fn new(req: HttpRequest, db: web::Data<DatabaseConnection>, iden: String) -> Self {
        let user_context = req.extensions().get::<UserAuthCotext>().cloned();
        Self {
            basic: BasicHandler {
                db: db.get_ref().clone(),
                user_context,
                req,
            },
            iden,
            user_id: None,
        }
    }

    /// Resolve user identifier to user ID
    async fn resolve_user_id(&self) -> Result<i64, HttpError> {
        if let Ok(user) = get_user_by_iden(&self.basic.db, &self.iden).await {
            return Ok(user.node_id);
        }
        if let Ok(user) = get_user_by_email(&self.basic.db, &self.iden).await {
            return Ok(user.node_id);
        }
        if let Ok(uid) = self.iden.parse::<i64>() {
            return Ok(uid);
        }
        Err(HttpError::CoreError(CoreError::UserNotFound))
    }

    pub async fn before(mut self) -> ResultHandler<Self> {
        self.user_id = Some(self.resolve_user_id().await?);
        Ok(self)
    }

    pub async fn perm(self) -> ResultHandler<Self> {
        // Profile is public, no permission check needed
        Ok(self)
    }

    /// Get user profile information
    pub async fn exec(self) -> ResultHandler<String> {
        let user_id = self.user_id.ok_or(HttpError::CoreError(CoreError::UserNotFound))?;
        let user = SimplyUser::load(&self.basic.db, user_id).await?;
        Ok(Json! {
            "user": user
        })
    }
}

#[get("/profile/{iden}")]
pub async fn get_profile(
    req: HttpRequest,
    db: web::Data<DatabaseConnection>,
    path: web::Path<String>,
) -> ResultHandler<String> {
    let iden = path.into_inner();
    Profile::new(req, db, iden).before().await?.perm().await?.exec().await
}

pub fn service() -> Scope {
    let service = services![
        post_register,
        before_create,
        get_check_iden,
        post_login,
        post_logout,
        post_manage,
        get_sidebar,
        get_user_info,
        get_profile
    ];
    web::scope("/api/user").service(service)
}
