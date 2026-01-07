use actix_web::{get, post, web, HttpRequest, Scope, HttpMessage};
use sea_orm::DatabaseConnection;
use serde::Deserialize;
use serde_json::json;
use std::collections::HashMap;
use rmjac_core::model::submit::SubmissionService;
use rmjac_core::service::judge::service::{StringOption, SubmitContext, CompileOptionValue};
use crate::handler::{BasicHandler, HttpError, ResultHandler, HandlerError};
use crate::utils::perm::UserAuthCotext;
use rmjac_core::model::vjudge::VjudgeAccount;
use rmjac_core::utils::get_redis_connection;

#[derive(Deserialize)]
pub struct SubmitReq {
    pub statement_id: i64,
    pub vjudge_id: i64,
    pub code: String,
    pub language: String,
    pub judge_option: HashMap<String, String>,
    pub public_view: bool,
}

pub struct Submit {
    basic: BasicHandler,
    data: SubmitReq,
}

impl Submit {
    pub fn entry(req: HttpRequest, db: web::Data<DatabaseConnection>, data: web::Json<SubmitReq>) -> Self {
        Self {
            basic: BasicHandler {
                db: db.get_ref().clone(),
                req: req.clone(),
                user_context: req.extensions().get::<UserAuthCotext>().cloned(),
            },
            data: data.into_inner(),
        }
    }

    pub async fn perm(self) -> ResultHandler<Self> {
        if let Some(uc) = &self.basic.user_context && uc.is_real {
            // Check if user owns the vjudge account
            if VjudgeAccount::new(self.data.vjudge_id).owned_by(&self.basic.db, uc.user_id).await.unwrap_or(false) {
                Ok(self)
            } else {
                Err(HttpError::HandlerError(HandlerError::PermissionDenied))
            }
        } else {
            Err(HttpError::HandlerError(HandlerError::PermissionDenied))
        }
    }

    pub async fn exec(self) -> ResultHandler<String> {
        let mut judge_option: HashMap<String, Box<dyn CompileOptionValue>> = HashMap::new();
        for (k, v) in self.data.judge_option {
            judge_option.insert(k, Box::new(StringOption { value: v }));
        }

        let context = SubmitContext {
            code: self.data.code.clone(),
        };

        let mut redis = get_redis_connection();
        let mut store = (&self.basic.db, &mut redis);

        let record = SubmissionService::submit(
            &mut store,
            self.data.statement_id,
            self.basic.user_context.unwrap().user_id,
            self.data.vjudge_id,
            &self.data.code,
            &self.data.language,
            judge_option,
            context,
            self.data.public_view,
        ).await.map_err(|e| HttpError::CoreError(e))?;

        Ok(json!({
            "code": 0,
            "msg": "Success",
            "data": record
        }).to_string())
    }
}

#[post("/submit")]
pub async fn submit_code(
    req: HttpRequest,
    db: web::Data<DatabaseConnection>,
    data: web::Json<SubmitReq>,
) -> ResultHandler<String> {
    Submit::entry(req, db, data).perm().await?.exec().await
}

pub struct GetOptions {
    basic: BasicHandler,
    platform: String,
}

impl GetOptions {
    pub fn entry(req: HttpRequest, db: web::Data<DatabaseConnection>, platform: String) -> Self {
        Self {
            basic: BasicHandler {
                db: db.get_ref().clone(),
                req: req.clone(),
                user_context: req.extensions().get::<UserAuthCotext>().cloned(),
            },
            platform,
        }
    }

    pub async fn perm(self) -> ResultHandler<Self> {
        // No special permission required to view options
        Ok(self)
    }

    pub async fn exec(self) -> ResultHandler<String> {
        let mut redis = get_redis_connection();
        let store = (&self.basic.db, &mut redis);
        let options = SubmissionService::allowed_methods(&store, &self.platform).await
            .map_err(|e| HttpError::CoreError(e))?;

        Ok(json!({
            "code": 0,
            "data": options
        }).to_string())
    }
}

#[get("/options/{platform}")]
pub async fn get_platform_options(
    req: HttpRequest,
    db: web::Data<DatabaseConnection>,
    path: web::Path<String>,
) -> ResultHandler<String> {
    GetOptions::entry(req, db, path.into_inner()).perm().await?.exec().await
}

pub fn service() -> Scope {
    web::scope("/api/submit")
        .service(submit_code)
        .service(get_platform_options)
}