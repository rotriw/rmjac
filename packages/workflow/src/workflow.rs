use async_trait::async_trait;
use serde::{Deserialize, Serialize};
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
    async fn verify(&self, input: &S) -> bool; // 实际 验证输入是否可用
    async fn execute(&self, input: &S) -> S; // 实际 执行服务
}

pub trait Status: StatusClone + 'static {
    fn add_value(&self, key: &str, value: Box<dyn Value>) -> Box<dyn Status>;
    fn concat(&self, values: &Box<dyn Status>) -> Box<dyn Status> {
        let mut res = self.clone_box();
        for (k, v) in values.get_all_value() {
            res = res.add_value(&k, v);
        }
        res
    }
    fn get_value(&self, key: &str) -> Option<Box<dyn Value>>;
    fn get_all_value(&self) -> Vec<(String, Box<dyn Value>)>;
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
    pub done: bool, // 是否已完成。 如果已完成, 当前服务为结束服务。
    pub init_value: S,
    pub is_lazy: bool, // 是否为lazy执行。 如果为 lazy, 当前服务存在编号。（弃用：必然拥有）
    pub task_id: Option<i64>, // 是否记录。
    pub history_value: Vec<HistoryStatus<S>>,
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
    const MAX_STEP: usize = 100000;
    const MAX_DEPTH: usize = 32;
    fn execute(&self, now_status: &NowStatus<S>, target: Box<dyn Service<S>>) -> impl Future<Output = Option<NowStatus<S>>>;
    fn next(&self, now_status: &NowStatus<S>, service: &Box<dyn Service<S>>) -> impl Future<Output = Option<NowStatus<S>>>; // next with used_service.
    fn next_auto(&self, now_status: &NowStatus<S>, service: &Box<dyn Service<S>>) -> impl Future<Output = Option<NowStatus<S>>>; // next with plan.
}


pub trait WorkflowPlanAction<S: Status + Clone> {
    fn get_required_input(&self, target: &str) -> impl Future<Output = Vec<TaskRequire>>;
}