use actix_web::{Scope, web};

pub mod default;

pub fn service() -> Scope {
    web::scope("/api/view")
        .service(default::handler::export_http_service())
}
