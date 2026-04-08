use crate::service::save::ManageService;
use crate::Result;
use std::fmt::format;
use redis::TypedCommands;
use resend_rs::{types::CreateDomainOptions, Resend};
use resend_rs::types::{CreateEmailBaseOptions, CreateEmailResponse};
use sea_orm::DatabaseConnection;
use crate::error::CoreError;
use crate::model::user::User;
use crate::service::save::Saved;
use crate::service::user::Verified;
use crate::utils::get_redis_connection;


pub async fn verify_email(db: &DatabaseConnection, email: &str, uid: i64, code: &str) -> Result<()> {
    if let Ok(value) = get_redis_connection().get(format!("verified:{}", code))
        && let Some(value) = value
        && !value.is_empty()
    {
        let email_in_redis: String = value;
        if email_in_redis != email {
            Err(CoreError::Guard("Invalid verification code.".to_string()))?;
        }

        get_redis_connection().del(format!("verified:{}", code))?;
        get_redis_connection().set(format!("email:{}", email), -1)?;
        let user = Saved::<User>::get(uid).await?;
        user.verified(db).await?;
        Ok(())
    } else {
        Err(CoreError::Guard("Invalid or expired verification code.".to_string()))?
    }
}


pub async fn send_verify_email_with_user(email: &str, name: &str, ) -> Result<()> {
    let data = include_str!("index.html");
    log::info!("Sending email to {}", email);
    // first check send
    let mut redis = get_redis_connection();
    if let Ok(value) = redis.get(format!("email:{}", email))
        && let Some(value) = value
        && !value.is_empty()
    {
            return Err(CoreError::Guard("Email have sent, please wait.".to_string()))
    }

    let uuid = uuid::Uuid::new_v4().to_string();
    let send_user = crate::env::EMAIL_SEND_NAME.lock().unwrap().to_string();
    let domain_name = crate::env::EMAIL_DOAMIN.lock().unwrap().clone();
    let resend = Resend::new(&crate::env::RESEND_KEY.lock().unwrap().to_string());
    /* let domain = resend.domains
        .add(CreateDomainOptions::new(&domain_name).with_custom_return_path("verify"))
        .await;
    if let Err(e) = domain {
        log::error!("Failed to add domain: {}", e);
        return Err(CoreError::Guard("Failed to send email, please try again later.".to_string()));
    }
    let domain = domain.unwrap(); */
    let from = format!("{} <verify@{}>", send_user, domain_name);
    let to = vec![email.to_string()];
    let subject = "验证您的邮箱 Rmj.ac".to_string();
    let basic_url = "https://api.rmj.ac/verify_mail";
    let mail = data.replace("{{user}}", name);
    let mail = mail.replace("{{link}}", &format!("{basic_url}?uuid={uuid}"));
    let email_send = CreateEmailBaseOptions::new(from, to, subject)
        .with_html(&mail);
    let _email = resend.emails.send(email_send).await;
    if let Err(e) = _email {
        log::error!("Failed to send email: {}", e);
        return Err(CoreError::Guard("Failed to send email, please try again later.".to_string()));
    }
    log::info!("Send email to {name}({email}) successfully!");
    redis.set_ex(format!("email:{}", email), 1, 60 * 5)?;
    redis.set_ex(format!("verified:{}", uuid), email, 60 * 10)?;
    Ok(())
}