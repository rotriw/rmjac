//! VJudge Workflow Services
//!
//! This module contains all the services that can be used in the VJudge workflow system.

pub mod remote;
pub mod submit;
pub mod db_update;

pub use remote::{RemoteEdgeService, RemoteServiceInfo};
pub use submit::{SubmitService, SubmitCompleteService, FetchResultService, JudgeOptionAdapter};
pub use db_update::{UpdateProblemService, UpdateVerifiedService};
