#![allow(incomplete_features)]
#![feature(super_let)]
#![allow(clippy::too_many_arguments)]
#![feature(trait_alias)]
#![feature(negative_impls)]
#![feature(specialization)]
pub type Result<T, E = error::CoreError> = std::result::Result<T, E>;

// Re-export paste for macros
pub use paste;

pub mod env;
pub mod error;
#[macro_use]
pub mod macros;
pub mod action;
pub mod db;
pub mod model;
pub mod service;
pub mod utils;

pub mod email;
pub mod pages;
