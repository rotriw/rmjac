use sea_orm::{
    ActiveModelBehavior, ActiveModelTrait, DatabaseConnection, EntityTrait, IntoActiveModel,
};
use tap::Conv;

pub mod node;
pub mod pages;
pub mod perm_group;
pub mod problem;
pub mod problem_limit;
pub mod problem_statement;
pub mod problem_tag;
pub mod problem_source;
pub mod token;
pub mod user;
pub mod iden;

use crate::Result;

pub trait DbNodeInfo {
    fn get_node_type(&self) -> &str;
}

pub trait DbNodeActiveModel<MODEL, NODE>
where
    MODEL: Into<NODE>
        + From<<<Self as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Model>,
    Self: Sized + Send + Sync + ActiveModelTrait + ActiveModelBehavior + DbNodeInfo,
{
    fn save_into_db(
        &self,
        db: &DatabaseConnection,
    ) -> impl std::future::Future<Output = Result<MODEL>> + Send
    where
        <Self::Entity as EntityTrait>::Model: IntoActiveModel<Self>,
    {
        async { Ok(self.clone().insert(db).await?.conv::<MODEL>()) }
    }
}
