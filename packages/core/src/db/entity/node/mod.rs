use sea_orm::{
    ActiveModelBehavior, ActiveModelTrait, DatabaseConnection, EntityTrait, IntoActiveModel,
};
use tap::Conv;

pub mod iden;
#[allow(clippy::module_inception)]
pub mod node;
pub mod pages;
pub mod perm_group;
pub mod problem;
pub mod problem_limit;
pub mod problem_source;
pub mod problem_statement;
pub mod problem_tag;
pub mod record;
pub mod testcase_subtask;
pub mod token;
pub mod user;
pub mod testcase;
pub mod training;
pub mod training_problem;
pub mod user_remote;

use crate::Result;

pub trait DbNodeInfo {
    fn get_node_type(&self) -> &str;
}

pub trait DbNodeActiveModel<MODEL, NODE>
where
    MODEL: Into<NODE>
        + From<<<Self as ActiveModelTrait>::Entity as EntityTrait>::Model>,
    Self: Sized + Send + Sync + ActiveModelTrait + ActiveModelBehavior + DbNodeInfo,
{
    fn save_into_db(
        &self,
        db: &DatabaseConnection,
    ) -> impl Future<Output = Result<MODEL>> + Send
    where
        <Self::Entity as EntityTrait>::Model: IntoActiveModel<Self>,
    {
        async { Ok(self.clone().insert(db).await?.conv::<MODEL>()) }
    }
}
