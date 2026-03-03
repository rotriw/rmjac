use crate::{Result, service::{perm::provider::ManagePermService, save::Saved}};
use sea_orm::DatabaseConnection;

use crate::service::perm::provider::Manage;
use crate::service::save::IdInfo;

pub mod db;
pub mod graph;
pub mod impled;
pub mod provider;
pub mod typed;

pub trait View {
    fn set_public_view(&self, db: &DatabaseConnection) -> impl Future<Output = Result<()>>;
    fn set_guest_view(&self, db: &DatabaseConnection) -> impl Future<Output = Result<()>>;
    fn set_owner(&self, user_id: impl IdInfo, db: &DatabaseConnection) -> impl Future<Output = Result<()>>;
}

impl<T> View for Saved<T> {
    async fn set_public_view(&self, db: &DatabaseConnection) -> Result<()> {
        ManagePermService::add(default_node!(default_strategy_node), self.id, Manage::View, db).await;
        Ok(())
    }

    async fn set_guest_view(&self, db: &DatabaseConnection) -> Result<()> {
        ManagePermService::add(default_node!(guest_user_node), self.id, Manage::View, db).await;
        Ok(())
    }

    async fn set_owner(&self, user_id: impl IdInfo, db: &DatabaseConnection) -> Result<()> {
        ManagePermService::add(user_id.get_id(), self.id, Manage::All, db).await;
        Ok(())
    }
}