//! VJudge Workflow System
//!
//! This module implements the WorkflowSystem trait for VJudge operations.

use sea_orm::{ActiveModelTrait, ColumnTrait, Iterable, Set};
use std::collections::HashMap;
use std::sync::Arc;
use sea_orm::{EntityTrait, IntoActiveModel, QueryFilter};
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;
use crate::env;
use workflow::workflow::{NowStatus, Service, Status, WorkflowAction, WorkflowPlanAction, WorkflowSystem};
use crate::env::db::get_connect;
use crate::graph::node::NodeRaw;
use crate::graph::node::user::remote_account::RemoteMode;
use crate::graph::node::vjudge_task::{VjudgeTaskNodePrivateRaw, VjudgeTaskNodePublicRaw, VjudgeTaskNodeRaw};
use crate::workflow::vjudge::services::{SubmitCompleteService, UpdateProblemService, UpdateVerifiedService, };
use crate::workflow::vjudge::services::from_node::FromNodeService;
pub struct VjudgeWorkflowSystem {
    pub services: Arc<RwLock<HashMap<String, Box<dyn Service>>>>,
}

impl Default for VjudgeWorkflowSystem {
    fn default() -> Self {
        Self {
            services: Arc::new(RwLock::new(HashMap::new())),
        }
    }
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

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub struct WorkflowRequire {
    pub start_require: String,
    pub route_describe: String,
    pub input_require: String,
}

