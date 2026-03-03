use actix_web::{Scope, web};

// Handler modules
pub mod create;
pub mod query;
pub mod view;

pub fn service() -> Scope {
    web::scope("/api/record")
        .service(view::handler::export_http_service())
        .service(create::handler::export_http_service())
        .service(query::handler::export_http_service())
}
