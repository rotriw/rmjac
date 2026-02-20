use actix_web::{Scope, web};

pub mod auth;

pub fn service() -> Scope {
    web::scope("/api/user")
        .service(auth::handler::export_http_service())
}
