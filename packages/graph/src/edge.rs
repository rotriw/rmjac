use std::fmt::Debug;
use sea_orm::DatabaseConnection;
use serde::Serialize;
use crate::typed::Saved;


// pub trait BasicEdge where
// Self: Sized + Send + Sync + Clone + Serialize + Debug {
//     fn basic_finder<F>(db: &DatabaseConnection, filter: F) -> impl Future<Output = Vec<Saved<Self>>>
//     where F: Fn() -> ;
//
// }