use actix_web::{Scope, web};

pub mod status;

pub fn service() -> Scope {
    web::scope("/api/tracker")
        .service(status::handler::export_http_service())
}
