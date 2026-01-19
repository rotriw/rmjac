use actix_web::{Scope, web};

pub mod options;
pub mod submit;

pub fn service() -> Scope {
    web::scope("/api/submit")
        .service(submit::handler::export_http_service())
        .service(options::handler::export_http_service())
}
