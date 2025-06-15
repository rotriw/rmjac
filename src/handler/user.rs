use actix_web::{get, services, web, HttpRequest, Scope};
use crate::handler::ResultHandler;

#[get("/")]
pub async fn new_data(req: HttpRequest) -> ResultHandler<String> {
    Ok("test".to_string())
}

pub fn service() -> Scope {
    let service = services! [
        new_data
    ];
    web::scope("/api/user").service(service)
}