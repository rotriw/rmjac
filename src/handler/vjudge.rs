use actix_web::{Scope, web};

pub mod account;
pub mod assign_task;
pub mod bind;
pub mod list_by_ids;
pub mod my_accounts;
pub mod task;
pub mod update;

pub fn service() -> Scope {
    web::scope("/api/vjudge")
        .service(bind::handler::export_http_service())
        .service(my_accounts::handler::export_http_service())
        .service(list_by_ids::handler::export_http_service())
        .service(account::handler::export_http_service())
        .service(update::handler::export_http_service())
        .service(task::handler::export_http_service())
        .service(assign_task::handler::export_http_service())
}
