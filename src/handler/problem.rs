use crate::handler::ResultHandler;
use actix_web::{HttpRequest, Scope, post, web};

// Handler modules
pub mod create;
pub mod list;
pub mod manage;
pub mod view;

pub fn service() -> Scope {
    web::scope("/api/problem")
        .service(view::handler::export_http_service())
        .service(manage::handler::export_http_service())
        .service(create::handler::export_http_service())
        .service(list::handler::export_http_service())
}
