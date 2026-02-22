use actix_web::{Scope, web};

pub mod event;

pub fn service() -> Scope {
    web::scope("/api/manage")
        .service(event::handler::export_http_service())
}
