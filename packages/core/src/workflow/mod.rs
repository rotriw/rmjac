//! Workflow Module
//!
//! This module provides workflow implementations for various subsystems.
//! Currently includes the VJudge workflow system.

pub mod vjudge;

// Re-export the workflow crate types for convenience
pub use workflow::workflow::{
    NowStatus, Service, ServiceInfo, Status, StatusDescribe, StatusRequire, TaskStatus,
    Value, ValueDescribe, ValueType, WorkflowSystem,
};

// Re-export new workflow value types
pub use workflow::value::{BaseValue, WorkflowValue, WorkflowValueError};
pub use workflow::status::{WorkflowValues, WorkflowStatus};
