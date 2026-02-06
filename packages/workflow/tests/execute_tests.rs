use futures::executor::block_on;
use std::sync::{
    atomic::{AtomicUsize, Ordering},
    Arc,
};

use workflow::workflow::{
    NowStatus, Status, StatusDescribe, StatusRequire, TaskStatus, WorkflowAction, WorkflowSystem,
};
use workflow::workflow::{Service, ServiceInfo, Value, ValueDescribe, ValueType};

#[derive(Clone)]
struct FlagStatus {
    flags: Vec<String>,
}

impl FlagStatus {
    fn new(flags: Vec<String>) -> Self {
        Self { flags }
    }

    fn has_flag(&self, flag: &str) -> bool {
        self.flags.iter().any(|f| f == flag)
    }

    fn add_flag(mut self, flag: String) -> Self {
        if !self.has_flag(&flag) {
            self.flags.push(flag);
        }
        self
    }
}

impl Status for FlagStatus {
    fn get_status(&self) -> String {
        self.flags.join(",")
    }

    fn get_status_type(&self) -> String {
        "flag".to_string()
    }

    fn get_value(&self, _key: &str) -> Option<Box<dyn Value>> {
        None
    }
}

fn parse_flags(status: &Box<dyn Status>) -> Vec<String> {
    let raw = status.get_status();
    if raw.is_empty() {
        return vec![];
    }
    raw.split(',').filter(|s| !s.is_empty()).map(|s| s.to_string()).collect()
}

fn status_has_flag(status: &Box<dyn Status>, flag: &str) -> bool {
    parse_flags(status).iter().any(|f| f == flag)
}

struct SimpleValueDescribe;

#[async_trait::async_trait(?Send)]
impl ValueDescribe for SimpleValueDescribe {
    fn get_type(&self) -> ValueType {
        ValueType::String
    }

    async fn has_str(&self, _s: &str) -> bool {
        true
    }

    async fn number(&self, _x: i64) -> bool {
        false
    }
}

struct FlagDescribe {
    flags: Vec<String>,
}

#[async_trait::async_trait(?Send)]
impl StatusDescribe for FlagDescribe {
    async fn value(&self, key: &str) -> Option<Vec<Box<dyn ValueDescribe>>> {
        if self.flags.iter().any(|flag| flag == key) {
            Some(vec![Box::new(SimpleValueDescribe)])
        } else {
            None
        }
    }
}

struct RequireFlag {
    flag: String,
}

#[async_trait::async_trait(?Send)]
impl StatusRequire for RequireFlag {
    async fn verify(&self, o: &Box<dyn StatusDescribe>) -> bool {
        o.value(&self.flag).await.is_some()
    }
}

struct RequireAny;

#[async_trait::async_trait(?Send)]
impl StatusRequire for RequireAny {
    async fn verify(&self, _o: &Box<dyn StatusDescribe>) -> bool {
        true
    }
}

enum VerifyMode {
    AlwaysTrue,
    OnlyIfMissingFlag(String),
    RequireFlag(String),
    FailOnceOnFlag { flag: String, counter: Arc<AtomicUsize> },
    AlwaysFalseOnFlag(String),
}

struct FlagService {
    name: String,
    require_flag: Option<String>,
    export_flag: Option<String>,
    verify_mode: VerifyMode,
    verify_calls: Option<Arc<AtomicUsize>>,
}

#[async_trait::async_trait(?Send)]
impl Service for FlagService {
    fn is_end(&self) -> bool {
        true
    }

    fn get_info(&self) -> ServiceInfo {
        ServiceInfo {
            name: self.name.clone(),
            description: "".to_string(),
            allow_description: "".to_string(),
        }
    }

    fn get_cost(&self) -> i32 {
        1
    }

    fn get_import_require(&self) -> Box<dyn StatusRequire> {
        match &self.require_flag {
            Some(flag) => Box::new(RequireFlag { flag: flag.clone() }),
            None => Box::new(RequireAny),
        }
    }

    fn get_export_describe(&self) -> Vec<Box<dyn StatusDescribe>> {
        match &self.export_flag {
            Some(flag) => vec![Box::new(FlagDescribe {
                flags: vec![flag.clone()],
            })],
            None => vec![],
        }
    }

    async fn verify(&self, input: &Box<dyn Status>) -> bool {
        if let Some(counter) = &self.verify_calls {
            counter.fetch_add(1, Ordering::SeqCst);
        }

        let result = match &self.verify_mode {
            VerifyMode::AlwaysTrue => true,
            VerifyMode::OnlyIfMissingFlag(flag) => !status_has_flag(input, flag),
            VerifyMode::RequireFlag(flag) => status_has_flag(input, flag),
            VerifyMode::FailOnceOnFlag { flag, counter } => {
                if !status_has_flag(input, flag) {
                    false
                } else if counter.load(Ordering::SeqCst) == 0 {
                    counter.fetch_add(1, Ordering::SeqCst);
                    false
                } else {
                    true
                }
            }
            VerifyMode::AlwaysFalseOnFlag(flag) => !status_has_flag(input, flag) && false,
        };

        println!(
            "verify service={} status=[{}] result={}",
            self.name,
            input.get_status(),
            result
        );
        result
    }

    async fn execute(&self, input: &Box<dyn Status>) -> Box<dyn Status> {
        println!(
            "execute service={} input_status=[{}]",
            self.name,
            input.get_status()
        );
        let mut flags = parse_flags(input);
        if let Some(flag) = &self.export_flag {
            if !flags.iter().any(|f| f == flag) {
                flags.push(flag.clone());
            }
        }
        Box::new(FlagStatus::new(flags))
    }
}

struct BasicSystem;

impl WorkflowSystem for BasicSystem {
    const NAME: &'static str = "basic";
    const LINK: &'static str = "";
    const DESCRIPTION: &'static str = "";

    fn get_all_services(&self) -> Vec<Box<dyn Service>> {
        vec![
            Box::new(FlagService {
                name: "a".to_string(),
                require_flag: None,
                export_flag: Some("x".to_string()),
                verify_mode: VerifyMode::AlwaysTrue,
                verify_calls: None,
            }),
            Box::new(FlagService {
                name: "b".to_string(),
                require_flag: Some("x".to_string()),
                export_flag: Some("y".to_string()),
                verify_mode: VerifyMode::RequireFlag("x".to_string()),
                verify_calls: None,
            }),
        ]
    }

    fn get_allow_service(&self, _now_status: &NowStatus) -> Vec<Box<dyn Service>> {
        self.get_all_services()
    }

    async fn register_service(&mut self, _service: Box<dyn Service>) {}

    async fn deregister_service(&mut self, _service_name: &str) {}
}

struct ReplanSystem {
    fail_counter: Arc<AtomicUsize>,
}

impl WorkflowSystem for ReplanSystem {
    const NAME: &'static str = "replan";
    const LINK: &'static str = "";
    const DESCRIPTION: &'static str = "";

    fn get_all_services(&self) -> Vec<Box<dyn Service>> {
        vec![
            Box::new(FlagService {
                name: "a".to_string(),
                require_flag: None,
                export_flag: Some("x".to_string()),
                verify_mode: VerifyMode::OnlyIfMissingFlag("x".to_string()),
                verify_calls: None,
            }),
            Box::new(FlagService {
                name: "b".to_string(),
                require_flag: Some("x".to_string()),
                export_flag: Some("y".to_string()),
                verify_mode: VerifyMode::FailOnceOnFlag {
                    flag: "x".to_string(),
                    counter: self.fail_counter.clone(),
                },
                verify_calls: None,
            }),
        ]
    }

    fn get_allow_service(&self, _now_status: &NowStatus) -> Vec<Box<dyn Service>> {
        self.get_all_services()
    }

    async fn register_service(&mut self, _service: Box<dyn Service>) {}

    async fn deregister_service(&mut self, _service_name: &str) {}
}

struct DepthSystem {
    verify_calls: Arc<AtomicUsize>,
}

impl WorkflowSystem for DepthSystem {
    const NAME: &'static str = "depth";
    const LINK: &'static str = "";
    const DESCRIPTION: &'static str = "";

    fn get_all_services(&self) -> Vec<Box<dyn Service>> {
        vec![
            Box::new(FlagService {
                name: "seed".to_string(),
                require_flag: None,
                export_flag: Some("x".to_string()),
                verify_mode: VerifyMode::AlwaysTrue,
                verify_calls: None,
            }),
            Box::new(FlagService {
                name: "target".to_string(),
                require_flag: Some("x".to_string()),
                export_flag: Some("y".to_string()),
                verify_mode: VerifyMode::AlwaysFalseOnFlag("x".to_string()),
                verify_calls: Some(self.verify_calls.clone()),
            }),
        ]
    }

    fn get_allow_service(&self, _now_status: &NowStatus) -> Vec<Box<dyn Service>> {
        self.get_all_services()
    }

    async fn register_service(&mut self, _service: Box<dyn Service>) {}

    async fn deregister_service(&mut self, _service_name: &str) {}
}

fn base_now_status() -> NowStatus {
    NowStatus {
        status: TaskStatus::NotStart,
        init_value: Box::new(FlagStatus::new(vec![])),
        is_lazy: false,
        task_id: None,
        history_value: vec![],
    }
}

#[test]
fn execute_generates_task_id_and_history() {
    println!("[test] execute_generates_task_id_and_history");
    let system = BasicSystem;
    let now_status = base_now_status();

    let result = block_on(system.execute(&now_status, "b", || async { 101 }));
    let result = result.expect("execute should succeed");

    println!("[test] result status={:?}", result.status);
    assert_eq!(result.task_id, Some(101));
    assert_eq!(result.status, TaskStatus::Success);
    assert_eq!(result.history_value.len(), 2);
    assert_eq!(result.history_value[0].service_name, "a");
    assert_eq!(result.history_value[1].service_name, "b");
}

#[test]
fn execute_replans_after_verify_failure() {
    println!("[test] execute_replans_after_verify_failure");
    let counter = Arc::new(AtomicUsize::new(0));
    let system = ReplanSystem {
        fail_counter: counter.clone(),
    };
    let now_status = base_now_status();

    let result = block_on(system.execute(&now_status, "b", || async { 202 }));
    let result = result.expect("execute should succeed after replan");

    println!("[test] replan counter={}", counter.load(Ordering::SeqCst));
    assert_eq!(counter.load(Ordering::SeqCst), 1);
    assert_eq!(result.task_id, Some(202));
    assert_eq!(result.status, TaskStatus::Success);
    assert_eq!(result.history_value.len(), 2);
    assert_eq!(result.history_value[0].service_name, "a");
    assert_eq!(result.history_value[1].service_name, "b");
}

#[test]
fn execute_stops_at_max_depth() {
    println!("[test] execute_stops_at_max_depth");
    let verify_calls = Arc::new(AtomicUsize::new(0));
    let system = DepthSystem {
        verify_calls: verify_calls.clone(),
    };
    let now_status = base_now_status();

    let result = block_on(system.execute(&now_status, "target", || async { 303 }));
    println!(
        "[test] depth verify_calls={} result_is_none={}",
        verify_calls.load(Ordering::SeqCst),
        result.is_none()
    );

    assert!(result.is_none());
}
