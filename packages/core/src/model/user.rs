use sea_orm::DatabaseConnection;

use crate::{
    db,
    error::CoreError,
    node::user::{UserNode, UserNodePrivate, UserNodePublic},
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
    let new_node = db::entity::node::create_node(&db, node_iden.as_str(), "user").await?;
    let user = db::entity::user::create_user(
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
    Ok(UserNode {
        node_id: new_node.node_id,
        node_iden: new_node.node_iden,
        public: UserNodePublic {
            name: name.to_string(),
            email: email.to_string(),
            creation_time: chrono::Utc::now().timestamp_millis(),
            creation_order: user.user_creation_order,
            last_login_time: chrono::Utc::now().to_rfc3339(),
            avatar: avatar.to_string(),
            description: String::new(),
            bio: String::new(),
            profile_show: vec![],
        },
        private: UserNodePrivate {
            password: password.to_string(),
        },
    })
}
