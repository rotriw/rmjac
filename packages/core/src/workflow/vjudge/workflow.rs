use std::sync::Arc;
use sea_orm::Iterable;
use workflow::workflow::{Service, WorkflowPlanAction, WorkflowSystem};
use crate::env;
use crate::graph::node::user::remote_account::RemoteMode;
use crate::workflow::vjudge::services::{UpdateProblemService, UpdateVerifiedService};
use crate::workflow::vjudge::services::from_node::FromNodeService;
use crate::workflow::vjudge::system::{VjudgeWorkflowSystem, WorkflowRequire};

pub async fn global() -> Arc<VjudgeWorkflowSystem> {
    if let Some(workflow) = env::VJUDGE_WORKFLOW
        .lock()
        .unwrap()
        .as_ref()
        .map(Arc::clone)
    {
        return workflow;
    }
    let workflow = Arc::new(VjudgeWorkflowSystem::default());
    let mut guard = env::VJUDGE_WORKFLOW.lock().unwrap();
    if let Some(existing) = guard.as_ref() {
        return Arc::clone(existing);
    }
    *guard = Some(Arc::clone(&workflow));
    workflow
}

pub async fn get_require(service_name: &str) -> Vec<WorkflowRequire> {
   global().await.clone()
        .get_required_input(service_name).await
        .iter().map(|v| {
        WorkflowRequire {
            start_require: v.start_service_info.name.clone(),
            route_describe: v.route_describe.clone(),
            input_require: v.require.describe()
        }
    }).collect()
}

pub async fn register_service(service: Box<dyn Service>) {
    let workflow = env::VJUDGE_WORKFLOW.lock().unwrap();
    workflow.as_ref().unwrap().services.write().await.insert(service.get_info().name, service);
}

pub async fn register_default_service() {
    register_service(Box::new(UpdateProblemService::new())).await;
    register_service(Box::new(UpdateVerifiedService::new())).await;
    for mode in RemoteMode::iter() {
        register_service(Box::new(FromNodeService::new(mode))).await;
    }
}