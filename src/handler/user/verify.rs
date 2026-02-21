use actix_web::{get, web, HttpResponse};
use chrono::NaiveDateTime;
use sea_orm::ColumnType::DateTime;
use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};
use rmjac_core::email::{send_verify_email_with_user, verify_email};
use rmjac_core::model::user::User;
use rmjac_core::now_time;
use rmjac_core::service::save::{ManageService, Saved};
use crate::handler::ResultHandler;

#[derive(Deserialize, Serialize, Debug)]
pub struct VerifyPath {
    uuid: String,
    uid: i64,
    email: String,
}

#[get("/verify")]
pub async fn verify(path: web::Query<VerifyPath>, db: web::Data<DatabaseConnection>) -> ResultHandler<HttpResponse> {
    let v = path.into_inner();
    let x = verify_email(&db, &v.email, v.uid, &v.uuid).await;
    let time = now_time!();
    if let Err(e) = x {
        let html = include_str!("./error.html");
        let html = html.replace("{{detail}}", format!("{:?}", e).as_str());
        let html = html.replace("{{time}}", &format!("{} UTC", time.to_string()));
        Ok(HttpResponse::BadRequest().body(html))
    } else {
        let html = include_str!("./successful.html");
        let html = html.replace("{{time}}", &format!("{:?} UTC", time.to_string()));
        let html = html.replace("{{email}}", &v.email);
        let user = Saved::<User>::get(v.uid).await?;
        let html = html.replace("{{user}}", &user.data.name);
        Ok(HttpResponse::Ok().body(html))
    }
}