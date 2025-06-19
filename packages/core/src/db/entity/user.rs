use sea_orm::entity::prelude::*;
use sea_orm::{DeriveEntityModel, DeriveRelation, EnumIter};

use crate::error::CoreError;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "user")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub node_id: u64,
    pub user_name: String,
    pub user_email: String,
    pub user_password: String,
    pub user_avatar: String,
    pub user_creation_time: DateTime,
    pub user_creation_order: u64,
    pub user_last_login_time: DateTime,
    pub user_description: String,
    pub user_iden: String,
    pub user_bio: Option<String>,
    pub user_profile_show: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

pub async fn create_user(
    db: &DatabaseConnection,
    node_id: u64,
    user_name: &str,
    user_email: &str,
    user_password: &str,
    user_avatar: &str,
    user_creation_time: DateTime,
    user_last_login_time: DateTime,
    user_iden: &str,
    user_bio: Option<String>,
    user_profile_show: Option<Vec<String>>,
) -> Result<Model, CoreError> {
    use sea_orm::ActiveValue::{NotSet, Set};
    let new_user = ActiveModel {
        node_id: Set(node_id),
        user_name: Set(user_name.to_string()),
        user_email: Set(user_email.to_string()),
        user_password: Set(user_password.to_string()),
        user_avatar: Set(user_avatar.to_string()),
        user_creation_time: Set(user_creation_time),
        user_creation_order: NotSet,
        user_last_login_time: Set(user_last_login_time),
        user_description: NotSet,
        user_iden: Set(user_iden.to_string()),
        user_bio: Set(user_bio),
        user_profile_show: Set(user_profile_show.unwrap_or_default().join(",")),
    };
    Ok(new_user.insert(db).await?)
}
