use actix_web::{Scope, web};

pub mod create;
pub mod view;

pub fn service() -> Scope {
    web::scope("/api/problem")
        .service(create::handler::export_http_service())
        .service(view::handler::export_http_service())
}
