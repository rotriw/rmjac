use sea_orm::DatabaseConnection;
use crate::service::save::Saved;
use crate::Result;

pub trait CreateWithDB: Sized {
    fn create(&self, db: &DatabaseConnection) -> impl Future<Output = Result<Saved<Self>>>;

}