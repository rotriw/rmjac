use sea_orm::prelude::async_trait::async_trait;
use serde::{Deserialize, Serialize};
use crate::model::problem::{Problem, ProblemStatement};

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct UserViewPage {
    pub user_iden: String,
    pub email: String,
    pub solved_problems: Vec<Problem>,
    pub unsolved_problems: Vec<Problem>,
    pub register_time: String
}

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct ProblemViewPage {
    pub problem: Problem,
    pub statement: ProblemStatement,
}

