use sea_orm::{ActiveModelBehavior, ActiveModelTrait, DatabaseConnection, EntityTrait, IntoActiveModel};
use tap::Conv;
use crate::Result;

pub mod edge;
pub mod perm_view;
pub mod perm_manage;

pub trait DbEdgeInfo {
    fn get_edge_type(&self) -> &str;
}

pub trait DbEdgeActiveModel<MODEL, EDGE>
where
    MODEL: Into<EDGE>
        + From<<<Self as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Model>,
    Self: Sized + Send + Sync + ActiveModelTrait + ActiveModelBehavior,
{
    async fn save_into_db(&self, db: &DatabaseConnection) -> Result<MODEL>
    where
        <Self::Entity as EntityTrait>::Model: IntoActiveModel<Self>,
    {
        Ok(self.clone().insert(db).await?.conv::<MODEL>())
    }
}