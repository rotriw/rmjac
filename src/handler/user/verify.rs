use actix_web::{get, web, HttpResponse};
use chrono::{Datelike, NaiveDateTime};
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
    let html = include_str!("../../template/index.html");
    let html = html.replace("{{title}}", "邮箱验证结果");
    let html = html.replace("{{now_year}}", &time.year().to_string());
    let html = html.replace("{{footnote}}", &format!("{} UTC", time.to_string()));
    if let Err(e) = x {
        let html = html.replace("{{content_title}}", "验证失败");
        let html = html.replace("{{content}}", format!("发生了错误！原因：{:?}", e).as_str());
        Ok(HttpResponse::BadRequest().body(html))
    } else {
        let html = html.replace("{{content_title}}", "感谢注册。");
        let user = Saved::<User>::get(v.uid).await?;
        let html = html.replace("{{content}}", &format!("您好 {}, 您的邮箱 {} 已经完成验证。<br/> 请返回 <a href=\"rmj.ac\">Rmj.ac</a> 重新登录。", user.data.name, v.email));
        Ok(HttpResponse::Ok().body(html))
    }
}