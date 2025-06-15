type Result<T> = std::result::Result<T, error::CoreError>;

pub mod env;
pub mod error;
#[macro_use]
pub mod macros;
pub mod db;
pub mod graph;
pub mod model;
pub mod node;
pub mod service;
pub mod utils;
