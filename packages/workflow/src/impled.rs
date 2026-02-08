use crate::plan::plan_method;
use crate::workflow::{HistoryStatus, NowStatus, Service, Status, StatusClone, Value, WorkflowAction, WorkflowSystem};

impl<T: WorkflowSystem> WorkflowAction for T {

    async fn next(&self, now_status: &NowStatus, service: &Box<dyn Service>) -> Option<NowStatus> {
        log::debug!("Executing workflow action, next service: {}", service.get_info().name);
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
        }).await?;
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
            return None;
        }
        // used_next.
        self.next(now_status, &planed_services[0]).await
    }

    async fn execute(&self, now_status: &NowStatus, target: Box<dyn Service>) -> Option<NowStatus> {
        let target_name = target.get_info().name;
        log::debug!("Executing workflow action, target: {}", target.get_info().name);
        let task_id = self.generate_task_id(&target_name).await;
        let mut current_status: Box<dyn crate::workflow::Status> = now_status.init_value.clone();
        let mut step = 0;
        let mut depth = 0;
        let mut history_value = now_status.history_value.clone();
        let mut status = now_status.clone();
        loop {
            if step >= Self::MAX_STEP {
                break None;
            }

            if status.done {
                break Some(status);
            }

            status = self.next_auto(now_status, &target).await?;
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