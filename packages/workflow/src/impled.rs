use std::collections::{HashMap, HashSet};
use crate::plan::plan_method;
use crate::status::WorkflowStatus;
use crate::workflow::{HistoryStatus, NowStatus, Service, Status, StatusClone, StatusRequire, TaskRequire, Value, WorkflowAction, WorkflowPlanAction, WorkflowSystem};

impl<T: WorkflowSystem> WorkflowAction for T {

    async fn next(&self, now_status: &NowStatus, service: &Box<dyn Service>) -> Option<NowStatus> {
        if !service.verify(&now_status.init_value).await {
            return None;
        }
        let is_end = service.is_end();
        let new_status = service.execute(&now_status.init_value).await.clone_box();
        let mut history_value = now_status.history_value.clone();
        history_value.push(HistoryStatus {
            service_name: service.get_info().name,
            output_data: new_status.clone_box()
        });
        self.update_execute_status(now_status.task_id?, &NowStatus {
            done: is_end,
            init_value: new_status.clone_box(),
            is_lazy: now_status.is_lazy,
            task_id: now_status.task_id,
            history_value: history_value.clone(),
        }).await;
        Some(NowStatus {
            done: is_end,
            init_value: new_status,
            is_lazy: now_status.is_lazy,
            task_id: now_status.task_id,
            history_value,
        })
    }

    async fn next_auto(&self, now_status: &NowStatus, target: &Box<dyn Service>) -> Option<NowStatus> {
        let mut planed_services = plan_method(self.get_all_services().await, now_status.init_value.clone(), &target.get_info().name).await?;
        if planed_services.is_empty() {
            self.update_execute_status(
                now_status.task_id?,
                &NowStatus {
                    done: true,
                    init_value: now_status.init_value.clone(),
                    is_lazy: now_status.is_lazy,
                    task_id: now_status.task_id,
                    history_value: now_status.history_value.clone(),
                }
            ).await;
            return None;
        }
        // used_next.
        self.next(now_status, &planed_services[0]).await
    }

    async fn execute(&self, now_status: &NowStatus, target: Box<dyn Service>) -> Option<NowStatus> {
        let target_name = target.get_info().name;
        let task_id = self.generate_task_id(&target_name).await;
        let mut current_status: Box<dyn crate::workflow::Status> = now_status.init_value.clone();
        let mut step = 0;
        let mut history_value = now_status.history_value.clone();
        let mut status = now_status.clone();
        status.task_id = Some(task_id);
        loop {
            if step >= Self::MAX_STEP {
                break None;
            }

            if status.done {
                break Some(status);
            }

            let ne_status = self.next_auto(&status, &target).await;
            if ne_status.is_none() {
                break Some(NowStatus {
                    done: true,
                    init_value: Box::new(WorkflowStatus::Failed { error: "".to_string(), context: None }), // TODO: ADD context.
                    is_lazy: status.is_lazy,
                    task_id: Some(task_id),
                    history_value,
                });
            }
            status = ne_status.unwrap();
            step += 1;
        }

    }
}

impl Value for serde_json::Value {
    fn get_type(&self) -> String {
        match self {
            serde_json::Value::Null => "null".to_string(),
            serde_json::Value::Bool(_) => "bool".to_string(),
            serde_json::Value::Number(_) => "number".to_string(),
            serde_json::Value::String(_) => "string".to_string(),
            serde_json::Value::Array(_) => "array".to_string(),
            serde_json::Value::Object(_) => "object".to_string(),
        }
    }
    fn to_string(&self) -> String {
        serde_json::to_string(self).unwrap()
    }
}

impl Status for serde_json::Value {
    fn get_value(&self, key: &str) -> Option<Box<dyn Value>> {
        match self.get(key) {
            Some(v) => Some(Box::new(v.clone())),
            None => None,
        }
    }

    fn add_value(&self, key: &str, value: Box<dyn Value>) -> Box<dyn Status> {
        let mut new_obj = self.as_object().cloned().unwrap_or_default();
        new_obj.insert(key.to_string(), serde_json::from_str(&value.to_string()).unwrap());
        Box::new(serde_json::Value::Object(new_obj))
    }

    fn get_all_value(&self) -> Vec<(String, Box<dyn Value>)> {
        let mut res: Vec<(String, Box<dyn Value>)> = vec![];
        if let Some(obj) = self.as_object() {
            for (k, v) in obj {
                res.push((k.clone(), Box::new(v.clone())));
            }
        }
        res
    }
}

impl<T: WorkflowSystem> WorkflowPlanAction for T {
    async fn get_required_input(&self, target: &str) -> Vec<TaskRequire> {
        let service = self.get_service(target).await;
        let ga = self.get_all_services().await;
        for s in &ga {
            log::debug!("Available service for planning: {}", s.get_info().name);
        }
        log::info!("Planning required input for target service: {}", target);
        if service.is_none() {
            log::debug!("No service found for {}", target);
            return vec![];
        }
        let mut res = vec![];
        let mut que = queue::Queue::new();
        let all_services = self.get_all_services().await;
        let _ = que.queue((self.get_service(target).await.unwrap(), target.to_string()));
        let mut vis = HashSet::new();
        vis.insert(target.to_string());
        while (!que.is_empty()) {
            let (t, d) = que.dequeue().unwrap();
            log::info!("{}", t.get_info().name);
            res.push(TaskRequire {
               start_service_info: t.get_info(),
                require: t.get_import_require(),
                route_describe: d.clone()
            });
            for ver in &all_services {
                if vis.contains(&ver.get_info().name) {
                    continue;
                }
                for req in ver.get_export_describe() {
                    if t.get_import_require().verify(&req).await {
                        let _  = que.queue((ver.clone(), format!("{} > {}", ver.get_info().name, d)));
                        vis.insert(ver.get_info().name.clone());
                        break;
                    }
                }
            }
        }
        res
    }

}