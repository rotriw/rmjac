use actix_web::{web, HttpMessage, HttpRequest};
use sea_orm::DatabaseConnection;
use crate::utils::perm::UserAuthCotext;
pub struct DefaultTools {
    db: web::Data<DatabaseConnection>,
}

pub trait InitHandler {
    fn create_with_user_context(context: Option<UserAuthCotext>, req: HttpRequest) -> Self;
}

pub trait DefaultHandler where Self:InitHandler + Sized {

    async fn entry(req: HttpRequest) -> Self {
        let user_context = req.extensions().get::<UserAuthCotext>().cloned();
        Self::create_with_user_context(user_context, req)
    }
}