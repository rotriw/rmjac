use sea_orm::{
    ActiveModelBehavior, ActiveModelTrait, DatabaseConnection, EntityTrait, IntoActiveModel,
};
use tap::Conv;

use crate::db::entity::node::node::create_node;

pub mod node;
pub mod problem;
pub mod problem_statement;
pub mod token;
pub mod user;

use crate::Result;

pub trait DbNodeInfo {
    fn get_node_type(&self) -> &str;
}

pub trait DbNodeActiveModel<MODEL, NODE>
where
    MODEL: Into<NODE>
        + From<<<Self as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Model>,
    Self: Sized + Send + Sync + ActiveModelTrait + ActiveModelBehavior + DbNodeInfo, {
    async fn save_into_db(&self, db: &DatabaseConnection) -> Result<MODEL>
    where
        <Self::Entity as EntityTrait>::Model: IntoActiveModel<Self>,
    {
        Ok(self.clone().insert(db).await?.conv::<MODEL>())
    }
}
