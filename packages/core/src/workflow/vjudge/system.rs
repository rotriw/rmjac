//! VJudge Workflow System
//!
//! This module implements the WorkflowSystem trait for VJudge operations.

use sea_orm::{ActiveModelTrait, ColumnTrait, Set};
use std::collections::HashMap;
use std::sync::Arc;
use sea_orm::{EntityTrait, IntoActiveModel, QueryFilter};
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;
use crate::env;
use crate::workflow::vjudge::VjudgeWorkflow;
use workflow::workflow::{NowStatus, Service, Status, WorkflowAction, WorkflowSystem};
use crate::env::db::get_connect;
use crate::graph::node::NodeRaw;
use crate::graph::node::vjudge_task::{VjudgeTaskNodePrivateRaw, VjudgeTaskNodePublicRaw, VjudgeTaskNodeRaw};
use crate::workflow::vjudge::services::{
    FetchResultService, RemoteEdgeService, RemoteServiceInfo, SubmitCompleteService, SubmitService,
    UpdateProblemService, UpdateVerifiedService,
};
use crate::service::socket::workflow::WorkflowServiceMetadata;
use crate::workflow::vjudge::status::VjudgeStatus;

/// The VJudge Workflow System
///
/// This system manages all services available for VJudge operations,
/// including local services and dynamically registered remote edge services.
pub struct VjudgeWorkflowSystem {
    /// All registered services
    services: Arc<RwLock<HashMap<String, Box<dyn Service>>>>,
}

impl Default for VjudgeWorkflowSystem {
    fn default() -> Self {
        Self {
            services: Arc::new(RwLock::new(HashMap::new())),
        }
    }
}

/// Create a new system with default services for all supported platforms
pub async fn build_default_vjudge_workflow_system() -> VjudgeWorkflowSystem {
    let system = VjudgeWorkflowSystem::default();
    register_default_services(&system).await;
    system
}

/// Register default local services for all supported platforms
async fn register_default_services(system: &VjudgeWorkflowSystem) {
    let mut services = system.services.write().await;
    let update_problem = UpdateProblemService::new();
    let name = update_problem.get_info().name.clone();
    services.insert(name, Box::new(update_problem));
    let update_verified = UpdateVerifiedService::new();
    let name = update_verified.get_info().name.clone();
    services.insert(name, Box::new(update_verified));
    let submit_complete = SubmitCompleteService::new();
    let name = submit_complete.get_info().name.clone();
    services.insert(name, Box::new(submit_complete));
}

pub async fn get_local_services(system: &VjudgeWorkflowSystem) -> Vec<Box<dyn Service>> {
    let services = system.services.read().await;
    services.values().cloned().collect()
}

pub async fn service_count(system: &VjudgeWorkflowSystem) -> usize {
    let services = system.services.read().await;
    services.len()
}

pub async fn has_service(system: &VjudgeWorkflowSystem, name: &str) -> bool {
    let services = system.services.read().await;
    services.contains_key(name)
}

pub async fn get_services_for_platform(
    system: &VjudgeWorkflowSystem,
    platform: &str,
) -> Vec<String> {
    let services = system.services.read().await;
    services
        .keys()
        .filter(|name| name.contains(platform) || *name == "sync_list")
        .cloned()
        .collect()
}

pub async fn execute_service(
    system: &VjudgeWorkflowSystem,
    service_name: &str,
    now_status: &NowStatus,
    id: i64,
) -> Option<NowStatus> {
    system.execute(now_status, system.get_service(service_name).await?).await
}

#[derive(Deserialize, Serialize, Clone, Debug, ts_rs::TS)]
#[ts(export)]
pub struct VjudgeHistoryStep {
    pub service_name: String,
    pub output_value: HashMap<String, String>,
}

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub struct VjudgeWorkflowSystemMessage {
    pub final_service: String,
    pub now_value: HashMap<String, String>,
    pub history_step: Vec<VjudgeHistoryStep>,
}

#[async_trait::async_trait(?Send)]
impl WorkflowSystem for VjudgeWorkflowSystem {
    const NAME: &'static str = "vjudge";
    const LINK: &'static str = "/vjudge";
    const DESCRIPTION: &'static str = "VJudge workflow system for managing remote judge operations";

    async fn get_service(&self, name: &str) -> Option<Box<dyn Service>> {
        self.services.read().await.get(name).cloned()
    }

    async fn generate_task_id(&self, service_name: &str) -> i64 {
        let db = get_connect().await.unwrap();
        VjudgeTaskNodeRaw {
            public: VjudgeTaskNodePublicRaw {
                status: "init".to_string(),
                log: "".to_string(),
                service_name: service_name.to_string(),
                workflow_snapshot: None,
            },
            private: VjudgeTaskNodePrivateRaw {}
        }.save(&db).await.unwrap().node_id
    }

    async fn update_execute_status(&self, task_id: i64, status: &NowStatus) -> Option<()> {
        use crate::db::entity::node::vjudge_task::{Entity, Column};
        let x = Entity::find()
            .filter(Column::NodeId.eq(task_id))
            .one(&get_connect().await.unwrap())
            .await.unwrap()?;
        let now_data = &status.init_value.get_all_value();
        let mut now_value = HashMap::new();
        for (k, v) in now_data {
            now_value.insert(k.clone(), v.to_string());
        }
        let mut history_step = Vec::new();
        for history in &status.history_value {
            let data = history.output_data.get_all_value();
            let mut output_value = HashMap::new();
            for (k, v) in data {
                output_value.insert(k.clone(), v.to_string());
            }
            history_step.push(
                VjudgeHistoryStep {
                    service_name: history.service_name.clone(),
                    output_value,
                }
            );
        }
        let convert = VjudgeWorkflowSystemMessage {
            final_service: x.service_name.clone(),
            now_value,
            history_step
        };
        let mut x = x.into_active_model();
        x.log = Set(serde_json::to_string(&convert).unwrap());
        let db = get_connect().await.unwrap();
        let _ = x.update(&db).await;
        Some(())
    }

    async fn get_all_services(&self) -> Vec<Box<dyn Service>> {
        let mut services: Vec<Box<dyn Service>> = Vec::new();
        let local = self.services.read().await;
        services.extend(local.values().cloned());
        drop(local);

        services.extend(load_remote_services());
        services
    }

    async fn register_service(&mut self, service: Box<dyn Service>) {
        let name = service.get_info().name.clone();
        let mut services = self.services.write().await;
        services.insert(name, service);
    }

    async fn deregister_service(&mut self, service_name: &str) {
        let mut services = self.services.write().await;
        services.remove(service_name);
    }
}

fn load_remote_services() -> Vec<Box<dyn Service>> {
    let workflow = match VjudgeWorkflow::try_global() {
        Some(workflow) => workflow,
        None => return vec![],
    };
    let metadata_map = workflow.service_metadata().lock().unwrap().clone();
    metadata_map
        .into_iter()
        .filter_map(|(key, value)| {
            let metadata: WorkflowServiceMetadata = serde_json::from_value(value).ok()?;
            let (required_keys, required_status_types) = parse_import_require(&metadata.import_require);
            let export_keys = parse_export_describe(&metadata.export_describe);

            let input_status_type = required_status_types
                .first()
                .cloned()
                .unwrap_or_else(|| "initial".to_string());
            let output_status_types = if metadata.is_end {
                vec!["completed".to_string(), "error".to_string()]
            } else {
                vec!["error".to_string()]
            };

            let capabilities = if metadata.method.is_empty() {
                vec![metadata.operation.clone()]
            } else {
                vec![metadata.operation.clone(), metadata.method.clone()]
            };

            let info = RemoteServiceInfo {
                service_id: key.clone(),
                name: if metadata.name.is_empty() { key.clone() } else { metadata.name.clone() },
                description: metadata.description.clone(),
                allow_description: metadata.allow_description.clone(),
                platform: metadata.platform.clone(),
                operation: metadata.operation.clone(),
                method: metadata.method.clone(),
                capabilities,
                cost: metadata.cost,
                is_end: metadata.is_end,
                input_status_type,
                output_status_types,
                required_keys,
                required_status_types,
                export_keys,
            };

            Some(Box::new(RemoteEdgeService::new(info, "")) as Box<dyn Service>)
        })
        .collect()
}

fn parse_import_require(value: &serde_json::Value) -> (Vec<String>, Vec<String>) {
    let required_keys = value
        .get("requiredKeys")
        .and_then(|v| v.as_array())
        .map(|items| {
            items
                .iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();

    let required_status_types = value
        .get("requiredStatusTypes")
        .and_then(|v| v.as_array())
        .map(|items| {
            items
                .iter()
                .filter_map(|v| v.as_str().map(|s| s.to_lowercase()))
                .collect()
        })
        .unwrap_or_default();

    (required_keys, required_status_types)
}

fn parse_export_describe(values: &[serde_json::Value]) -> Vec<String> {
    values
        .iter()
        .filter_map(|value| value.get("key").and_then(|v| v.as_str()).map(|s| s.to_string()))
        .collect()
}


/// Builder for VjudgeWorkflowSystem
pub struct VjudgeWorkflowSystemBuilder {
    extra_platforms: Vec<String>,
    include_default_services: bool,
}

impl VjudgeWorkflowSystemBuilder {
    /// Create a new builder
    pub fn new() -> Self {
        Self {
            extra_platforms: vec![],
            include_default_services: true,
        }
    }

    /// Add a platform
    pub fn with_platform(mut self, platform: &str) -> Self {
        self.extra_platforms.push(platform.to_string());
        self
    }

    /// Set whether to include default services
    pub fn with_default_services(mut self, include: bool) -> Self {
        self.include_default_services = include;
        self
    }

    /// Build the workflow system
    pub async fn build(self) -> VjudgeWorkflowSystem {
        let system = VjudgeWorkflowSystem::default();
        register_default_services(&system).await;
        system
    }
}

impl Default for VjudgeWorkflowSystemBuilder {
    fn default() -> Self {
        Self::new()
    }
}