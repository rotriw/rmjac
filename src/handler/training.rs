use actix_web::{Scope, web};

pub mod todo;
pub mod view;
pub fn service() -> Scope {
    web::scope("/api/training")
        .service(view::handler::export_http_service())
        .service(todo::handler::export_http_service())
}
