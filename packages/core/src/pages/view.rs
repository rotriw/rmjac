use sea_orm::prelude::async_trait::async_trait;
use serde::Serialize;
use crate::model::problem::Problem;

#[derive(Debug, Clone, Serialize)]
pub struct UserViewPage {
    pub user_iden: String,
    pub email: String,
    pub solved_problems: Vec<Problem>,
    pub unsolved_problems: Vec<Problem>,
    pub register_time: String
}