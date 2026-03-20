use actix_web::{Scope, web};

pub mod view;
pub fn service() -> Scope {
    web::scope("/api/training").service(create::handler::export_http_service())
}
