use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tokio::sync::RwLock;
use workflow::workflow::{NowStatus, Service, Status, WorkflowAction, WorkflowSystem};
use serde_json::Value;
use crate::env;
use crate::service::socket::workflow::{dispatch_workflow_task, WorkflowTaskResponse};
use crate::workflow::vjudge::system::{
    build_default_vjudge_workflow_system, execute_service, get_services_for_platform,
    has_service, service_count, get_local_services, VjudgeWorkflowSystem,
};

/// VJudge Workflow
///
/// A single entry-point wrapper around the VJudge workflow system.
pub struct VjudgeWorkflow {
    system: Arc<RwLock<VjudgeWorkflowSystem>>,
    service_index: Mutex<HashMap<String, Vec<String>>>,
    service_registry: Mutex<HashMap<String, Vec<String>>>,
    service_metadata: Mutex<HashMap<String, Value>>,
    task_status_cache: Mutex<HashMap<String, (Value, chrono::NaiveDateTime)>>,
}

impl VjudgeWorkflow {
    /// Build a workflow with default services.
    pub async fn new_default() -> Self {
        let system = build_default_vjudge_workflow_system().await;
        Self {
            system: Arc::new(RwLock::new(system)),
            service_index: Mutex::new(HashMap::new()),
            service_registry: Mutex::new(HashMap::new()),
            service_metadata: Mutex::new(HashMap::new()),
            task_status_cache: Mutex::new(HashMap::new()),
        }
    }

    /// Get the global VJudge workflow, initializing it on first use.
    pub async fn global() -> Arc<VjudgeWorkflow> {
        if let Some(workflow) = env::VJUDGE_WORKFLOW
            .lock()
            .unwrap()
            .as_ref()
            .map(Arc::clone)
        {
            return workflow;
        }

        let workflow = Arc::new(VjudgeWorkflow::new_default().await);

        let mut guard = env::VJUDGE_WORKFLOW.lock().unwrap();
        if let Some(existing) = guard.as_ref() {
            return Arc::clone(existing);
        }
        *guard = Some(Arc::clone(&workflow));
        workflow
    }

    /// Try to get the global workflow without initializing it.
    pub fn try_global() -> Option<Arc<VjudgeWorkflow>> {
        env::VJUDGE_WORKFLOW
            .lock()
            .unwrap()
            .as_ref()
            .map(Arc::clone)
    }

    /// Get a shared reference to the underlying system lock.
    pub fn system(&self) -> Arc<RwLock<VjudgeWorkflowSystem>> {
        Arc::clone(&self.system)
    }

    pub fn service_index(&self) -> &Mutex<HashMap<String, Vec<String>>> {
        &self.service_index
    }

    pub fn service_registry(&self) -> &Mutex<HashMap<String, Vec<String>>> {
        &self.service_registry
    }

    pub fn service_metadata(&self) -> &Mutex<HashMap<String, Value>> {
        &self.service_metadata
    }

    pub fn task_status_cache(&self) -> &Mutex<HashMap<String, (Value, chrono::NaiveDateTime)>> {
        &self.task_status_cache
    }

    pub fn register_service_metadata(&self, key: &str, value: Value) {
        self.service_metadata
            .lock()
            .unwrap()
            .insert(key.to_string(), value);
    }

    pub fn register_remote_service_keys(&self, socket_id: &str, keys: Vec<String>) {
        self.remove_socket_registration(socket_id);

        if keys.is_empty() {
            return;
        }

        self.service_registry()
            .lock()
            .unwrap()
            .insert(socket_id.to_string(), keys.clone());

        let mut index = self.service_index().lock().unwrap();
        for key in keys {
            let entry = index.entry(key).or_insert_with(Vec::new);
            if !entry.contains(&socket_id.to_string()) {
                entry.push(socket_id.to_string());
            }
        }
    }

    pub fn unregister_remote_service_keys(&self, socket_id: &str, service_names: &[String]) {
        let mut index = self.service_index().lock().unwrap();
        let mut registry = self.service_registry().lock().unwrap();

        for name in service_names {
            if let Some(sockets) = index.get_mut(name) {
                sockets.retain(|id| id != socket_id);
                if sockets.is_empty() {
                    index.remove(name);
                }
            }
        }

        if let Some(registered) = registry.get_mut(socket_id) {
            registered.retain(|key| !service_names.contains(key));
            if registered.is_empty() {
                registry.remove(socket_id);
            }
        }
    }

    pub fn deregister_socket(&self, socket_id: &str) {
        self.remove_socket_registration(socket_id);
    }

    pub fn remove_socket_registration(&self, socket_id: &str) {
        let services = self
            .service_registry()
            .lock()
            .unwrap()
            .remove(socket_id);
        if let Some(services) = services {
            let mut index = self.service_index().lock().unwrap();
            for key in services {
                if let Some(sockets) = index.get_mut(&key) {
                    sockets.retain(|id| id != socket_id);
                    if sockets.is_empty() {
                        index.remove(&key);
                    }
                }
            }
        }
    }

    pub fn update_task_status_cache(&self, task_id: &str, status_data: Value) {
        self.task_status_cache
            .lock()
            .unwrap()
            .insert(
                task_id.to_string(),
                (status_data, chrono::Utc::now().naive_utc()),
            );
    }

    pub fn get_task_status_cache(&self, task_id: &str) -> Option<(Value, chrono::NaiveDateTime)> {
        self.task_status_cache
            .lock()
            .unwrap()
            .get(task_id)
            .cloned()
    }

    pub fn remove_task_status_cache(&self, task_id: &str) {
        self.task_status_cache
            .lock()
            .unwrap()
            .remove(task_id);
    }

    /// Register a workflow service.
    pub async fn register_service(&self, service: Box<dyn Service>) {
        let mut system = self.system.write().await;
        system.register_service(service).await;
    }

    /// Deregister a workflow service.
    pub async fn deregister_service(&self, service_name: &str) {
        let mut system = self.system.write().await;
        system.deregister_service(service_name).await;
    }

    /// List all services (local + remote).
    pub async fn get_all_services(&self) -> Vec<Box<dyn Service>> {
        let system = self.system.read().await;
        system.get_all_services().await
    }

    /// List all local services.
    pub async fn get_local_services(&self) -> Vec<Box<dyn Service>> {
        let system = self.system.read().await;
        get_local_services(&system).await
    }

    /// Count registered local services.
    pub async fn service_count(&self) -> usize {
        let system = self.system.read().await;
        service_count(&system).await
    }

    /// Check if a service exists locally.
    pub async fn has_service(&self, name: &str) -> bool {
        let system = self.system.read().await;
        has_service(&system, name).await
    }

    /// List service names by platform.
    pub async fn get_services_for_platform(&self, platform: &str) -> Vec<String> {
        let system = self.system.read().await;
        get_services_for_platform(&system, platform).await
    }

    /// Get a snapshot of the service index for handlers.
    pub async fn get_service_index(&self) -> HashMap<String, Vec<String>> {
        self.service_index
            .lock()
            .unwrap()
            .iter()
            .map(|(k, v)| (k.clone(), v.clone()))
            .collect()
    }

    /// Execute a specific service if possible.
    pub async fn execute_service(
        &self,
        service_name: &str,
        now_status: &NowStatus,
        task_id: i64,
    ) -> Option<NowStatus> {
        let system = self.system.read().await;
        execute_service(&system, service_name, now_status, task_id).await
    }

    /// Dispatch a workflow task to edge service via Socket.IO.
    pub async fn dispatch_task(
        &self,
        task_id: &str,
        service_name: &str,
        platform: &str,
        operation: &str,
        method: &str,
        input: Value,
        timeout_ms: Option<u64>,
    ) -> WorkflowTaskResponse {
        dispatch_workflow_task(
            task_id,
            service_name,
            platform,
            operation,
            method,
            input,
            timeout_ms,
        )
        .await
    }

    /// Execute a workflow plan until the target service is reached.
    pub async fn execute_target<G>(
        &self,
        now_status: &NowStatus,
        target: &str,
        generate_task_id: G,
    ) -> Option<NowStatus>
    where
        G: AsyncFnOnce() -> i64 + Send,
    {
        let system = self.system.read().await;
        system.execute(now_status, system.get_service(target).await?).await
    }
}
