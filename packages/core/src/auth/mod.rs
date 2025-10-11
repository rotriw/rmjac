//! Authentication and authorization module
//!
//! This module provides authentication context management and permission utilities
//! for the graph-based permission system.

pub mod context;
pub mod utils;

// Re-export commonly used types and functions
pub use context::*;
pub use utils::*;