pub type Result<T, E = error::CoreError> = std::result::Result<T, E>;

pub mod env;
pub mod error;
#[macro_use]
pub mod macros;
pub mod db;
pub mod graph;
pub mod model;
pub mod service;
pub mod utils;
pub mod auth;
