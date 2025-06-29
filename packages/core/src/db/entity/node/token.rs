use crate::db::entity::node::{DbNodeActiveModel, DbNodeInfo};
use crate::graph::node::token::TokenNode;
use sea_orm::entity::prelude::*;
use sea_orm::{DeriveEntityModel, DeriveRelation, EnumIter};

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

impl DbNodeActiveModel<Model, TokenNode> for ActiveModel {}
impl DbNodeInfo for ActiveModel {
    fn get_node_type(&self) -> &str {
        "token"
    }
}