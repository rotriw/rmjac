//! VJudge Workflow Module
//!
//! This module provides the workflow system for VJudge operations,
//! implementing the workflow engine traits for managing remote judge operations.
//!
//! # Architecture
//!
//! The VJudge workflow system consists of:
//!
//! - **Status Types**: Define the states a VJudge task can be in
//! - **Services**: Individual operations that can be performed
//! - **Workflow System**: Coordinates services and manages task execution
//! - **Remote Services**: Proxy for TypeScript edge services
//!
//! # Example
//!
//! ```ignore
//! use rmjac_core::workflow::vjudge::{VjudgeWorkflowSystem, VjudgeStatus};
//!
//! // Create a workflow system with default services
//! let system = VjudgeWorkflowSystem::with_default_services().await;
//!
//! // Create an initial status
//! let status = VjudgeStatus::new_initial("codeforces", "1900A");
//!
//! // Execute workflow...
//! ```

pub mod status;
pub mod services;
pub mod system;
pub mod workflow;
pub mod executor;

pub use system::{VjudgeWorkflowSystem, VjudgeWorkflowSystemBuilder};
pub use workflow::VjudgeWorkflow;
pub use services::RemoteEdgeService;
pub use services::remote::{RemoteServiceInfo, RemoteServiceRegistry};
