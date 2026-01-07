use actix_web::{web, Scope, HttpMessage};
use serde::Deserialize;
use std::collections::HashMap;
use rmjac_core::model::submit::SubmissionService;
use rmjac_core::service::judge::service::{StringOption, SubmitContext, CompileOptionValue};
use crate::handler::{BasicHandler, HttpError, ResultHandler, HandlerError};
use crate::utils::perm::UserAuthCotext;
use rmjac_core::model::vjudge::VjudgeAccount;
use rmjac_core::utils::get_redis_connection;
use macro_handler::{generate_handler, handler, perm, route};

#[derive(Deserialize)]
pub struct SubmitReq {
    pub statement_id: i64,
    pub vjudge_id: i64,
    pub code: String,
    pub language: String,
    pub judge_option: HashMap<String, String>,
    pub public_view: bool,
}

// Submit Handler - 提交代码
#[generate_handler]
mod submit {
    use super::*;

    #[handler("/normal")]
    pub struct Submit {
        basic: BasicHandler,
    }

    impl Submit {
        #[perm]
        async fn check_submit_perm(&self) -> bool {
            // 只检查用户登录状态，具体的 vjudge 账户检查在 exec 中进行
            if let Some(uc) = &self.basic.user_context && uc.is_real {
                true
            } else {
                false
            }
        }

        #[handler]
        #[route("/submit")]
        async fn post_submit(&self, data: SubmitReq) -> ResultHandler<String> {
            let uc = self.basic.user_context.as_ref().unwrap();
            
            // Check if user owns the vjudge account
            if !VjudgeAccount::new(data.vjudge_id).owned_by(&self.basic.db, uc.user_id).await.unwrap_or(false) {
                return Err(HttpError::HandlerError(HandlerError::PermissionDenied));
            }

            let mut judge_option: HashMap<String, Box<dyn CompileOptionValue>> = HashMap::new();
            for (k, v) in data.judge_option {
                judge_option.insert(k, Box::new(StringOption { value: v }));
            }

            let context = SubmitContext {
                code: data.code.clone(),
            };

            let mut redis = get_redis_connection();
            let mut store = (&self.basic.db, &mut redis);

            let record = SubmissionService::submit(
                &mut store,
                data.statement_id,
                uc.user_id,
                data.vjudge_id,
                &data.code,
                &data.language,
                judge_option,
                context,
                data.public_view,
            ).await.map_err(HttpError::CoreError)?;

            Ok(Json! {
                "code": 0,
                "msg": "Success",
                "data": record
            })
        }
    }
}

// Options Handler - 获取平台选项
#[generate_handler]
mod options {
    use super::*;

    #[handler("/options")]
    pub struct Options {
        basic: BasicHandler,
    }

    impl Options {
        #[handler]
        #[route("/{platform}")]
        async fn get_options(&self, platform: &str) -> ResultHandler<String> {
            let mut redis = get_redis_connection();
            let store = (&self.basic.db, &mut redis);
            let options = SubmissionService::allowed_methods(&store, platform).await
                .map_err(HttpError::CoreError)?;

            Ok(Json! {
                "code": 0,
                "data": options
            })
        }
    }
}

pub fn service() -> Scope {
    web::scope("/api/submit")
        .service(submit::Submit::export_http_service())
        .service(options::Options::export_http_service())
}
