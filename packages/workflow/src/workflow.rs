use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::any::Any;
use crate::status::WorkflowValues;

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ServiceInfo {
    pub name: String,
    pub description: String,
    pub allow_description: String,
}

pub trait Value {
    fn get_type(&self) -> String;
    fn to_string(&self) -> String;
}

impl Value for String {
    fn get_type(&self) -> String {
        "String".to_string()
    }
    fn to_string(&self) -> String {
        self.clone()
    }
}


#[async_trait::async_trait(?Send)]
pub trait StatusRequire {
    async fn verify(&self, o: &Box<dyn StatusDescribe>) -> bool;
    fn as_any(&self) -> &dyn Any;
    fn describe(&self) -> String { // 描述要求。
        "No description".to_string()
    }
}


pub struct TaskRequire {
    pub start_service_info: ServiceInfo, // 起始服务信息
    pub require: Box<dyn StatusRequire>, // 输入要求
    pub route_describe: String, // 路径描述
}

pub enum ValueType { // TODO: 实际上并没有被用到，基本上被bypass了。等有时间了要让他能用，
    Number,
    String,
    Others(String),
}

// 对于一个值的描述。
#[async_trait::async_trait(?Send)]
pub trait ValueDescribe {
    fn get_type(&self) -> ValueType;
    async fn maybe_eq(&self, o: &str) -> bool; // 是否可能相等。TODO: let o more general.
    async fn has_str(&self, s: &str) -> bool; // 指定字符串是否可能出现在当前值。
    async fn number(&self, x: i64) -> bool; // 要求的数字是否可能出现在当前值。

    fn describe(&self) -> String {
        "No description".to_string()
    } // 描述当前值的特征, 供人类阅读。

}

#[async_trait::async_trait(?Send)]
pub trait StatusDescribe {
    async fn value(&self, key: &str) -> Option<Vec<Box<dyn ValueDescribe>>>;
    fn as_any(&self) -> &dyn Any;
    async fn describe(&self) -> String {
        "No description".to_string()
    }
}

pub trait ServiceClone<T> {
    fn clone_box(&self) -> Box<dyn Service<T>>;
}

impl<T, S> ServiceClone<S> for T
where
    T: 'static + Service<S> + Clone,
    S: Status + Clone,
{
    fn clone_box(&self) -> Box<dyn Service<S>> {
        Box::new(self.clone())
    }
}

impl<T> Clone for Box<dyn Service<T>> {
    fn clone(&self) -> Self {
        self.clone_box()
    }
}

#[async_trait::async_trait(?Send)]
pub trait Service<S: Status + Clone = WorkflowValues>: ServiceClone<S> + Send + Sync {
    fn is_end(&self) -> bool; // 是否为结束服务
    fn get_info(&self) -> ServiceInfo; // 获取服务信息
    fn get_cost(&self) -> i32; // 获取服务预计消耗。
    fn get_import_require(&self) -> Box<dyn StatusRequire>; // 获取输入变量的描述。 for plan
    fn get_export_describe(&self) -> Vec<Box<dyn StatusDescribe>>; // 获取输出变量的描述。 for plan
    /// 执行后是否继承上一状态的值（默认继承，merge 旧值与新输出）。
    fn inherit_status(&self) -> bool {
        true
    }
    async fn verify(&self, input: &S) -> bool; // 实际 验证输入是否可用
    async fn execute(&self, input: &S) -> S; // 实际 执行服务
}

pub trait Status: StatusClone + Any + 'static {
    fn add_value(&self, key: &str, value: Box<dyn Value>) -> Box<dyn Status>;
    fn concat(&self, values: &Box<dyn Status>) -> Box<dyn Status> {
        let mut res = self.clone_box();
        for (k, v) in values.get_all_value() {
            res = res.add_value(&k, v);
        }
        res
    }
    fn as_any(&self) -> &dyn Any;
    fn get_value(&self, key: &str) -> Option<Box<dyn Value>>;
    fn get_all_value(&self) -> Vec<(String, Box<dyn Value>)>;

    /// 检查当前状态是否为终止失败状态
    ///
    /// 用于在执行过程中检测服务是否返回了失败信号，以便及时退出。
    /// 默认返回 `false`。`WorkflowValues` 会在 `Final(Failed)` 时返回 `true`。
    fn is_final_failed(&self) -> bool {
        false
    }

    /// 导出任务执行状态
    ///
    /// 返回描述当前执行状态的字符串。
    /// 默认返回 `"running"`。`WorkflowValues` 会根据 `Final` 变体返回对应状态。
    fn export_task_status(&self) -> String {
        "running".to_string()
    }

    /// 获取终止失败状态的错误信息
    fn final_error_message(&self) -> Option<String> {
        None
    }
}

pub trait StatusClone {
    fn clone_box(&self) -> Box<dyn Status>;
}

impl<T> StatusClone for T
where
    T: 'static + Status + Clone,
{
    fn clone_box(&self) -> Box<dyn Status> {
        Box::new(self.clone())
    }
}

impl Clone for Box<dyn Status> {
    fn clone(&self) -> Self {
        self.clone_box()
    }
}

#[derive(Clone)]
pub struct HistoryStatus<S: Clone + Status = WorkflowValues> {
    pub service_name: String,
    pub output_data: S,
}

#[derive(Deserialize, Serialize, Debug, Clone, PartialEq, Eq)]
pub enum TaskStatus {
    NotStart,
    Running,
    Success,
    Failed,
    NoMethod,
    OtherStatus(String),
}

impl From<String> for TaskStatus {
    fn from(value: String) -> Self {
        match value.as_str() {
            "NotStart" => TaskStatus::NotStart,
            "Running" => TaskStatus::Running,
            "Success" => TaskStatus::Success,
            "Failed" => TaskStatus::Failed,
            "NoMethod" => TaskStatus::NoMethod,
            other => TaskStatus::OtherStatus(other.to_string()),
        }
    }
}

#[derive(Clone)]
pub struct NowStatus<S: Status + Clone = WorkflowValues> {
    pub init_value: S,
    pub done: bool,
    pub status: TaskStatus,
    pub is_lazy: bool, // 是否为lazy执行。 如果为 lazy, 当前服务存在编号。（弃用：必然拥有）
    pub task_id: Option<i64>, // 是否记录。
    pub history_value: Vec<HistoryStatus<S>>,
}

impl<S: Status + Clone> NowStatus<S> {
    /// 检查任务是否已完成（成功、失败或无方法）
    pub fn is_done(&self) -> bool {
        self.done || matches!(self.status, TaskStatus::Success | TaskStatus::Failed | TaskStatus::NoMethod)
    }

    /// 检查任务是否正在运行
    pub fn is_running(&self) -> bool {
        matches!(self.status, TaskStatus::Running)
    }

    /// 检查任务是否失败
    pub fn is_failed(&self) -> bool {
        matches!(self.status, TaskStatus::Failed)
    }

    /// 检查任务是否被取消
    pub fn is_cancelled(&self) -> bool {
        matches!(self.status, TaskStatus::OtherStatus(ref s) if s == "Cancelled")
    }
}

#[async_trait::async_trait(?Send)]
pub trait WorkflowSystem<S: Status + Clone = WorkflowValues> {
    const NAME: &'static str;
    const LINK: &'static str;
    const DESCRIPTION: &'static str;
    async fn get_all_services(&self) -> Vec<Box<dyn Service<S>>>;
    async fn get_allow_service(&self, now_status: &NowStatus<S>) -> Vec<Box<dyn Service<S>>> {
        let services = self.get_all_services().await;
        let mut allow = Vec::new();
        for service in services {
            if service.verify(&now_status.init_value).await {
                allow.push(service);
            }
        }
        allow
    }

    async fn update_execute_status(&self, task_id: i64, status: &NowStatus<S>) -> Option<()>;

    async fn get_service(&self, name: &str) -> Option<Box<dyn Service<S>>>;
    async fn register_service(&mut self, service: Box<dyn Service<S>>);
    async fn deregister_service(&mut self, service_name: &str);

    async fn generate_task_id(&self, service: &str) -> i64;
    async fn get_reachable_targets(&self, input: &S) -> Vec<Box<dyn Service<S>>> {
        let services = self.get_all_services().await;
        let mut targets = Vec::new();
        for service in services {
            if !service.is_end() {
                continue;
            }
            if service.verify(&input).await {
                targets.push(service);
            }
        }
        targets
    }
}

pub trait WorkflowAction<S: Status + Clone = WorkflowValues> {
    const MAX_STEP: usize = 1000;
    const MAX_DEPTH: usize = 32;
    /// 同一服务连续执行的最大次数，超过此值视为死循环
    const MAX_REPEAT_SAME_SERVICE: usize = 3;
    fn execute(&self, now_status: &NowStatus<S>, target: Box<dyn Service<S>>) -> impl Future<Output = Option<NowStatus<S>>>;
    fn next(&self, now_status: &NowStatus<S>, service: &Box<dyn Service<S>>) -> impl Future<Output = Option<NowStatus<S>>>; // next with used_service.
    fn next_auto(&self, now_status: &NowStatus<S>, service: &Box<dyn Service<S>>) -> impl Future<Output = Option<NowStatus<S>>>; // next with plan.
}


pub trait WorkflowPlanAction<S: Status + Clone> {
    fn get_required_input(&self, target: &str) -> impl Future<Output = Vec<TaskRequire>>;
}