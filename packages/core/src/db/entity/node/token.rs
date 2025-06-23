use chrono::{Duration, naive::NaiveDateTime, Utc};
use sea_orm::entity::prelude::*;
use sea_orm::ActiveValue::Set;
use sea_orm::{DeriveEntityModel, DeriveRelation, EnumIter};
use crate::error::CoreError;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "node_token")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub node_id: i64,
    pub token: String,
    pub token_type: String,
    pub token_expiration: DateTime,
    pub service: String,
    pub token_iden: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

pub fn gen_token() -> String {
    use uuid::Uuid;
    let uuid = Uuid::new_v4();
    let token = uuid.to_string();
    token
}

pub async fn create_token(
    db: &DatabaseConnection,
    node_id: i64,
    service: &str,
    token_iden: &str,
    token_expiration: Option<NaiveDateTime>,
    token_type: &str,
) -> Result<Model, CoreError> {
    let token = gen_token();
    let token_expiration = token_expiration.unwrap_or((Utc::now() + Duration::days(7)).naive_utc()); // now + 7days
    let token = ActiveModel {
        node_id: Set(node_id),
        token: Set(token),
        token_type: Set(token_type.to_string()),
        token_expiration: Set(token_expiration),
        service: Set(service.to_string()),
        token_iden: Set(token_iden.to_string()),
    };
    let token = token.insert(db).await?;
    Ok(token)
}
