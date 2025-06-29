use crate::db::entity::node::{DbNodeActiveModel, DbNodeInfo};
use crate::error::CoreError;
use crate::graph::node::user::UserNode;
use sea_orm::entity::prelude::*;
use sea_orm::{DeriveEntityModel, DeriveRelation, EnumIter};

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "node_user")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub node_id: i64,
    pub user_name: String,
    pub user_email: String,
    pub user_password: String,
    pub user_avatar: String,
    pub user_creation_time: DateTime,
    pub user_creation_order: i64,
    pub user_last_login_time: DateTime,
    pub user_description: Option<String>,
    pub user_iden: String,
    pub user_bio: Option<String>,
    pub user_profile_show: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

impl DbNodeInfo for ActiveModel {
    fn get_node_type(&self) -> &str {
        "user"
    }
}

impl DbNodeActiveModel<Model, UserNode> for ActiveModel {}

pub async fn check_iden_exists(db: &DatabaseConnection, iden: &str) -> Result<bool, CoreError> {
    use sea_orm::EntityTrait;
    let exists = Entity::find()
        .filter(Column::UserIden.eq(iden))
        .one(db)
        .await?
        .is_some();
    Ok(exists)
}

pub async fn check_email_exists(db: &DatabaseConnection, email: &str) -> Result<bool, CoreError> {
    use sea_orm::EntityTrait;
    let exists = Entity::find()
        .filter(Column::UserEmail.eq(email))
        .one(db)
        .await?
        .is_some();
    Ok(exists)
}

pub async fn get_user_by_iden(db: &DatabaseConnection, iden: &str) -> Result<Model, CoreError> {
    use sea_orm::EntityTrait;
    let user = Entity::find()
        .filter(Column::UserIden.eq(iden))
        .one(db)
        .await?;
    if user.is_none() {
        return Err(CoreError::UserNotFound);
    }
    Ok(user.unwrap())
}

pub async fn get_user_by_email(db: &DatabaseConnection, email: &str) -> Result<Model, CoreError> {
    use sea_orm::EntityTrait;
    let user = Entity::find()
        .filter(Column::UserEmail.eq(email))
        .one(db)
        .await?;
    if user.is_none() {
        return Err(CoreError::UserNotFound);
    }
    Ok(user.unwrap())
}

pub async fn get_user_by_nodeid(db: &DatabaseConnection, node_id: i64) -> Result<Model, CoreError> {
    use sea_orm::EntityTrait;
    let user = Entity::find()
        .filter(Column::NodeId.eq(node_id))
        .one(db)
        .await?;
    if user.is_none() {
        return Err(CoreError::UserNotFound);
    }
    Ok(user.unwrap())
}