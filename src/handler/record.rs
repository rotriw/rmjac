use actix_web::{Scope, web};

// Handler modules
pub mod create;
pub mod list;
pub mod manage;
pub mod status;
pub mod view;

pub fn service() -> Scope {
    web::scope("/api/record")
        .service(view::handler::export_http_service())
        .service(create::handler::export_http_service())
        .service(manage::handler::export_http_service())
        .service(list::handler::export_http_service())
        .service(status::handler::export_http_service())
}
