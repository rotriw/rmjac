use std::fmt::Debug;
use std::process::Output;
use sea_orm::DatabaseConnection;
use serde::Serialize;


/*
    If you saved into the database, this is what you get back.
*/
#[derive(Clone, Debug, Serialize)]
pub struct Saved<T: Serialize + Clone + Debug> {
    pub id: i64,
    pub content: T,
}

/*
    A basic item that can be saved to and loaded from the database.
*/
pub trait BasicItem
where Self: Serialize + Clone + Debug {
    fn save(&self, db: &DatabaseConnection) -> impl Future<Output = Saved<Self>>;
    fn from_db(id: i64, db: &DatabaseConnection) -> impl Future<Output = Self>;
}
