use sea_orm::DatabaseConnection;
use workflow::workflow::{NowStatus, TaskStatus};
use crate::model::vjudge::VjudgeTask;
use crate::Result;
use crate::model::vjudge::workflow_dto::{WorkflowTaskRequest, WorkflowTaskResponseDTO};
use crate::workflow::vjudge::{VjudgeStatus, VjudgeWorkflow};

pub async fn execute_vjudge_task(db: &DatabaseConnection, task: &WorkflowTaskRequest) -> Result<WorkflowTaskResponseDTO> {
    log::debug!("Executing vjudge task: {}", task.service_name);
    let status: VjudgeStatus = task.input.values.clone().into();
    let now_status = NowStatus {
        done: false,
        init_value: Box::new(status),
        is_lazy: true,
        task_id: None,
        history_value: vec![]
    };

    let task_node = VjudgeTask::create(db, &task.service_name).await?;
    // TODO: make workflow execute in background and return task_id immediately
    VjudgeWorkflow::global().await.execute_service(&task.service_name, &now_status, task_node.node_id).await;
    Ok(WorkflowTaskResponseDTO {
        success: true,
        task_id: Some(task_node.node_id.to_string()),
        output: None,
        error: None,
    })
}