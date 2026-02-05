pub mod problem;
pub mod record;
pub mod training;
pub mod training_list;
pub mod user;
pub mod vjudge;
pub mod submit;

use sea_orm::DatabaseConnection;

pub trait ModelStore {
    fn get_db(&self) -> &DatabaseConnection;
    fn get_redis(&mut self) -> &mut redis::Connection;
}

impl<'a> ModelStore for (&'a DatabaseConnection, &'a mut redis::Connection) {
    fn get_db(&self) -> &DatabaseConnection {
        self.0
    }
    fn get_redis(&mut self) -> &mut redis::Connection {
        self.1
    }
}
