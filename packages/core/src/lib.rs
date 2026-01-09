#![feature(super_let)]
#![allow(clippy::too_many_arguments)]
pub type Result<T, E = error::CoreError> = std::result::Result<T, E>;

pub mod env;
pub mod error;
#[macro_use]
pub mod macros;
pub mod db;
pub mod declare;
pub mod graph;
pub mod model;
pub mod service;
pub mod utils;
