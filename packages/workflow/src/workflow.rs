use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ServiceInfo {
    pub name: String,
    pub description: String,
    pub allow_description: String,
}

pub trait Value {
    fn to_string(&self) -> String;
}


#[async_trait::async_trait(?Send)]
pub trait StatusRequire {
    async fn verify(&self, o: &Box<dyn StatusDescribe>) -> bool;
}

pub enum ValueType {
    Number,
    String,
}

// 对于一个值的描述。
#[async_trait::async_trait(?Send)]
pub trait ValueDescribe {
    fn get_type(&self) -> ValueType;
    async fn has_str(&self, s: &str) -> bool; // 指定字符串是否可能出现在当前值。
    async fn number(&self, x: i64) -> bool; // 要求的数字是否可能出现在当前值。

}

#[async_trait::async_trait(?Send)]
pub trait StatusDescribe {
    async fn value(&self, key: &str) -> Option<Vec<Box<dyn ValueDescribe>>>;
}

#[async_trait::async_trait(?Send)]
pub trait Service {
    fn is_end(&self) -> bool; // 是否为结束服务
    fn get_info(&self) -> ServiceInfo; // 获取服务信息
    fn get_cost(&self) -> i32; // 获取服务预计消耗。
    fn get_import_require(&self) -> Box<dyn StatusRequire>; // 获取输入变量的描述。 for plan
    fn get_export_describe(&self) -> Vec<Box<dyn StatusDescribe>>; // 获取输出变量的描述。 for plan
    async fn verify(&self, input: &Box<dyn Status>) -> bool; // 实际 验证输入是否可用
    async fn execute(&self, input: &Box<dyn Status>) -> Box<dyn Status>; // 实际 执行服务
}

pub trait Status: StatusClone + 'static {
    fn get_status(&self) -> String;
    fn get_status_type(&self) -> String;
    fn get_value(&self, key: &str) -> Option<Box<dyn Value>>;
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
pub struct HistoryStatus {
    pub service_name: String,
    pub output_data: Box<dyn Status>,
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

pub struct NowStatus {
    pub status: TaskStatus,
    pub init_value: Box<dyn Status>,
    pub is_lazy: bool, // 是否为lazy执行。 如果为 lazy, 当前服务存在编号。
    pub task_id: Option<i64>, // 是否记录。
    pub history_value: Vec<HistoryStatus>,
}

pub trait WorkflowSystem {
    const NAME: &'static str;
    const LINK: &'static str;
    const DESCRIPTION: &'static str;
    fn get_all_services(&self) -> Vec<Box<dyn Service>>;
    fn get_allow_service(&self, now_status: &NowStatus) -> Vec<Box<dyn Service>>;

    fn register_service(&mut self, service: Box<dyn Service>) -> impl Future<Output = ()>;

    fn deregister_service(&mut self, service_name: &str) -> impl Future<Output = ()>;
}

pub trait WorkflowAction {
    const MAX_STEP: usize = 100000;
    const MAX_DEPTH: usize = 32;
    fn execute<G: AsyncFnOnce() -> i64 + Send>(&self, now_status: &NowStatus, target: &str, generate_func: G) -> impl Future<Output = Option<NowStatus>>;
}
