use sea_orm::DatabaseConnection;

use crate::{
    db::{
        self,
        entity::{
            self, edge::edge::create_edge, node::{node::create_node, token::create_token, user::get_user_by_iden}
        },
    },
    error::CoreError,
    graph::node::{
        token::TokenNode,
        user::{UserNode, UserNodePrivate, UserNodePublic, UserNodeRaw}, NodeRaw,
    }, utils::encrypt::encode_password,
};

pub async fn create_default_user(
    db: &DatabaseConnection,
    iden: &str,
    name: &str,
    email: &str,
    avatar: &str,
    password: &str,
) -> Result<UserNode, CoreError> {
    let user = UserNodeRaw {
        public: UserNodePublic {
            name: name.to_string(),
            email: email.to_string(),
            iden: iden.to_string(),
            creation_time: chrono::Utc::now().naive_utc(),
            creation_order: 0,
            last_login_time: chrono::Utc::now().naive_utc(),
            avatar: avatar.to_string(),
            description: String::new(),
            bio: String::new(),
            profile_show: vec![],
        },
        private: UserNodePrivate {
            password: encode_password(&password.to_string()),
        },
    };
    let result = user.save(db).await?;
    Ok(result)
}

pub async fn check_iden_exists(db: &DatabaseConnection, iden: &str) -> Result<bool, CoreError> {
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
    let token = create_token(
        &db,
        None,
        service,
        token_iden,
        token_expiration,
        "login",
    )
    .await?;
    Ok((user.into(), token.into()))
}
