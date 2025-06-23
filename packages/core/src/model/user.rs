use sea_orm::DatabaseConnection;

use crate::{
    db::{self, entity::{self, node::{node::create_node, token::create_token, user::get_user_by_iden}}},
    error::CoreError,
    graph::node::{token::TokenNode, user::{UserNode, UserNodePrivate, UserNodePublic}},
};

pub async fn create_default_user(
    db: &DatabaseConnection,
    iden: &str,
    name: &str,
    email: &str,
    avatar: &str,
    password: &str,
) -> Result<UserNode, CoreError> {
    let node_iden = format!("user_{}", iden);
    let new_node = db::entity::node::node::create_node(&db, node_iden.as_str(), "user").await?;
    let user = db::entity::node::user::create_user(
        &db,
        new_node.node_id,
        name,
        email,
        password,
        avatar,
        chrono::Utc::now().naive_utc(),
        chrono::Utc::now().naive_utc(),
        iden,
        None, // bio
        None, // profile_show
    )
    .await?;
    Ok(user.into())
}

pub async fn check_iden_exists(
    db: &DatabaseConnection,
    iden: &str,
) -> Result<bool, CoreError> {
    let exists = entity::node::user::check_iden_exists(&db, iden).await?;
    Ok(exists)
}


pub async fn user_login(
    db: &DatabaseConnection,
    iden: &str,
    password: &str,
    service: &str,
    token_iden: &str,
    long_token: bool,
) -> Result<(UserNode, TokenNode), CoreError> {
    let user = get_user_by_iden(&db, iden).await?;
    if user.user_password != password {
        return Err(CoreError::UserNotFound);
    }
    let token_expiration = if long_token {
        Some((chrono::Utc::now() + chrono::Duration::days(30)).naive_utc())
    } else {
        None
    };
    let token_node = create_node(&db, service, token_iden).await?;
    let token = create_token(&db, token_node.node_id, service, token_iden, token_expiration, "main").await?;
    Ok((user.into(), token.into()))
}
