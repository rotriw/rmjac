use crate::handler::ResultHandler;
use actix_web::{HttpRequest, Scope, post, web};

// Handler modules
pub mod create;

pub fn service() -> Scope {
    web::scope("/api/problem")
        .service(view::handler::export_http_service())
}
