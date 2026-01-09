use actix_web::{Scope, web};

pub mod auth;
pub mod info;
pub mod manage;

pub fn service() -> Scope {
    web::scope("/api/user")
        .service(auth::handler::export_http_service())
        .service(info::handler::export_http_service())
        .service(manage::handler::export_http_service())
}