use crate::db::entity::node::node::create_node;
use crate::error::CoreError;
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

pub async fn create_user_node(
    db: &DatabaseConnection,
    node_id: Option<i64>,
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
    let node_id = match node_id {
        Some(id) => id,
        None => {
            let node = create_node(db, format!("user_{}", user_iden).as_str(), "user").await?;
            node.node_id
        }
    };
    if check_iden_exists(db, user_iden).await? {
        return Err(CoreError::UserIdenExists);
    }
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
        user_profile_show: Set(Some(user_profile_show.unwrap_or_default().join(","))),
    };
    Ok(new_user.insert(db).await?)
}

pub async fn check_iden_exists(db: &DatabaseConnection, iden: &str) -> Result<bool, CoreError> {
    use sea_orm::EntityTrait;
    let exists = Entity::find()
        .filter(Column::UserIden.eq(iden))
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
