//! VJudge Workflow Services
//!
//! This module contains all the services that can be used in the VJudge workflow system.

pub mod remote;
pub mod from_node;
pub mod flows;

pub use remote::{RemoteEdgeService, RemoteServiceInfo};
pub use flows::{RegisterAccountFlow, SubmitProblemFlow, SyncProblemFlow};
pub use from_node::{FromNodeService, VerifiedUserIdService};