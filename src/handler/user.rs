use actix_web::{Scope, web};

pub mod auth;
pub mod profile;
pub mod verify;

pub fn service() -> Scope {
    web::scope("/api/user")
        .service(auth::handler::export_http_service())
    .service(profile::handler::export_http_service())
        .service(verify::verify)
}
