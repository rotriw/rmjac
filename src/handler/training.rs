use actix_web::{Scope, web};

pub mod create;
pub mod manage;
pub mod status;
pub mod view;

pub fn service() -> Scope {
    web::scope("/api/training")
        .service(create::handler::export_http_service())
        .service(view::handler::export_http_service())
        .service(status::handler::export_http_service())
        .service(manage::handler::export_http_service())
}
