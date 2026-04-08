use actix_web::{Scope, web};

pub mod at;
pub mod cf;

pub fn service() -> Scope {
    web::scope("/api/sync")
        .service(cf::handler::export_http_service())
        .service(at::handler::export_http_service())
}
