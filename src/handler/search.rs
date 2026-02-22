use actix_web::{Scope, web};
use crate::handler::search;

pub mod view;

pub fn service() -> Scope {
    web::scope("/api/search")
        .service(view::handler::export_http_service())
}
