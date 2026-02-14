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
        log::info!("1Updating VJudge task {} status log", task_id);
        let db = get_connect().await.unwrap();
        let x = Entity::find()
            .filter(Column::NodeId.eq(task_id))
            .one(&db)
            .await.unwrap()?;
        log::info!("2Updating VJudge task {} status log", task_id);
        let now_data = &status.init_value.get_all_value();
        let mut now_value = HashMap::new();
        for (k, v) in now_data {
            now_value.insert(k.clone(), v.to_string());
        }
        log::info!("3Updating VJudge task {} status log", task_id);
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
        log::info!("4Updating VJudge task {} status log", task_id);
        let convert = VjudgeWorkflowSystemMessage {
            final_service: x.service_name.clone(),
            now_value,
            history_step
        };
        let mut x = x.into_active_model();
        log::info!("5Updating VJudge task {} status log", task_id);
        x.log = Set(serde_json::to_string(&convert).unwrap());
        // Persist the task status - combine NowStatus.status with init_value's export_task_status
        let status_str = {
            // 优先使用 init_value 的 Final 状态（如果有的话）
            let value_status = status.init_value.export_task_status();
            if value_status != "running" {
                // init_value 包含 Final 状态（failed/completed），优先使用
                value_status
            } else {
                // 否则使用 NowStatus 的 TaskStatus
                match &status.status {
                    workflow::workflow::TaskStatus::NotStart => "init".to_string(),
                    workflow::workflow::TaskStatus::Running => "running".to_string(),
                    workflow::workflow::TaskStatus::Success => "success".to_string(),
                    workflow::workflow::TaskStatus::Failed => "failed".to_string(),
                    workflow::workflow::TaskStatus::NoMethod => "no_method".to_string(),
                    workflow::workflow::TaskStatus::OtherStatus(s) => s.clone(),
                }
            }
        };
        x.status = Set(status_str);
        let _ = x.update(&db).await;
        log::info!("6Updating VJudge task {} status log", task_id);
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

