use crate::plan::plan_method;
use crate::workflow::{NowStatus, WorkflowAction, WorkflowSystem};

impl<T: WorkflowSystem> WorkflowAction for T {
    async fn execute<G: AsyncFnOnce() -> i64 + Send>(&self, now_status: &NowStatus, target: &str, generate_func: G) -> Option<NowStatus> {
        let task_id = generate_func().await;
        let mut current_status: Box<dyn crate::workflow::Status> = now_status.init_value.clone();
        let mut step = 0;
        let mut depth = 0;
        let mut history_value = now_status.history_value.clone();

        let mut planed_services = plan_method(self.get_all_services(), current_status.clone(), target).await?;

        while !planed_services.is_empty() {
            if step >= Self::MAX_STEP {
                return None;
            }

            let service = planed_services.remove(0);

            if !service.verify(&current_status).await {
                depth += 1;
                if depth >= Self::MAX_DEPTH {
                    return None;
                }
                planed_services = plan_method(self.get_all_services(), current_status.clone(), target).await?;
                continue;
            }

            let output_status = service.execute(&current_status).await;

            history_value.push(crate::workflow::HistoryStatus {
                service_name: service.get_info().name,
                output_data: output_status.clone(),
            });

            current_status = output_status;
            step += 1;
        }

        Some(NowStatus {
            status: crate::workflow::TaskStatus::Success,
            init_value: current_status,
            is_lazy: false,
            task_id: Some(task_id),
            history_value,
        })
    }
}