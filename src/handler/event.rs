use actix_web::{Scope, web};

pub mod view;

pub fn service() -> Scope {
    web::scope("/api/event")
        .service(view::handler::export_http_service())
}
