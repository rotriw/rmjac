//! VJudge Workflow 任务执行器
//!
//! 封装工作流任务的执行逻辑，供 HTTP handler 调用。

use sea_orm::DatabaseConnection;
use tap::Conv;
use workflow::status::WorkflowValues;
use workflow::value::BaseValue;
use workflow::workflow::{NowStatus, WorkflowAction, WorkflowSystem};
use crate::error::CoreError;
use crate::model::vjudge::workflow_dto::WorkflowTaskRequest;
use crate::Result;
use crate::workflow::vjudge::workflow::global;

/// 执行 VJudge 工作流任务
///
/// 根据请求中的 service_name，找到对应的 socket 并通过 callback 模式调度到边缘服务。
pub async fn execute_vjudge_task(
    _db: &DatabaseConnection,
    body: &serde_json::Value,
    service_name: &str,
) -> Result<i64> {
    let mut workflow_data = WorkflowValues::new();
    if let serde_json::Value::Object(value) = body {
        for (k, v) in value.iter() {
            workflow_data.add_untrusted(k, v.clone().conv::<BaseValue>());
        }
    } else {
        return Err(CoreError::StringError("Invalid input format".to_string()));
    }
    let request = NowStatus {
        done: false,
        init_value: Box::new(workflow_data.clone()),
        history_value: vec![],
        is_lazy: false,
        task_id: None,
    };

    let res = global().await.execute(&request, global().await.get_service(service_name).await.unwrap()).await;

    if res.is_none() {
        return Err(CoreError::StringError("Execution failed".to_string()));
    } else {
        Ok(res.unwrap().task_id.unwrap_or(-1))
    }
}
