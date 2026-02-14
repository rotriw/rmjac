use async_trait::async_trait;
use workflow::description::{WorkflowExportDescribe, WorkflowRequire};
use workflow::extra_start_points;
use workflow::plan::plan_method;
use workflow::status::{WorkflowValues, WorkflowStatus};
use workflow::workflow::{NowStatus, Service, ServiceInfo, Status, StatusDescribe, StatusRequire, TaskStatus, WorkflowAction};

fn make_now_status(values: WorkflowValues) -> NowStatus {
    NowStatus {
        done: false,
        status: TaskStatus::NotStart,
        init_value: values,
        is_lazy: false,
        task_id: Some(1),
        history_value: vec![],
    }
}

#[derive(Clone)]
struct TestService {
    name: &'static str,
    cost: i32,
    is_end: bool,
    require_keys: Vec<String>,
    export_keys: Vec<String>,
    inherit: bool,
    output_key: &'static str,
}

#[async_trait(?Send)]
impl Service for TestService {
    fn is_end(&self) -> bool {
        self.is_end
    }

    fn get_info(&self) -> ServiceInfo {
        ServiceInfo {
            name: self.name.to_string(),
            description: "test".to_string(),
            allow_description: "".to_string(),
        }
    }

    fn get_cost(&self) -> i32 {
        self.cost
    }

    fn get_import_require(&self) -> Box<dyn StatusRequire> {
        let mut require = WorkflowRequire::new();
        for key in &self.require_keys {
            require = require.with_key(key.clone());
        }
        Box::new(require)
    }

    fn get_export_describe(&self) -> Vec<Box<dyn StatusDescribe>> {
        let mut export = WorkflowExportDescribe::new();
        for key in &self.export_keys {
            export = export.add_has(key.clone());
        }
        vec![Box::new(export)]
    }

    fn inherit_status(&self) -> bool {
        self.inherit
    }

    async fn verify(&self, input: &WorkflowValues) -> bool {
        self.require_keys
            .iter()
            .all(|key| input.get_value(key).is_some())
    }

    async fn execute(&self, _input: &WorkflowValues) -> WorkflowValues {
        WorkflowValues::from_json_trusted(
            serde_json::json!({
                self.output_key: self.name,
            }),
            self.name,
        )
    }
}

#[derive(Default)]
struct TestSystem;

#[async_trait(?Send)]
impl workflow::workflow::WorkflowSystem for TestSystem {
    const NAME: &'static str = "test";
    const LINK: &'static str = "/";
    const DESCRIPTION: &'static str = "test";

    async fn get_all_services(&self) -> Vec<Box<dyn Service>> {
        Vec::new()
    }

    async fn update_execute_status(&self, _task_id: i64, _status: &NowStatus) -> Option<()> {
        None
    }

    async fn get_service(&self, _name: &str) -> Option<Box<dyn Service>> {
        None
    }

    async fn register_service(&mut self, _service: Box<dyn Service>) {}

    async fn deregister_service(&mut self, _service_name: &str) {}

    async fn generate_task_id(&self, _service: &str) -> i64 {
        1
    }
}

#[test]
fn test_plan_method_shortest_path() {
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .expect("runtime");
    runtime.block_on(async {
    let s1 = TestService {
        name: "s1",
        cost: 1,
        is_end: false,
        require_keys: vec![],
        export_keys: vec!["a".to_string()],
        inherit: true,
        output_key: "a",
    };
    let s2 = TestService {
        name: "s2",
        cost: 5,
        is_end: false,
        require_keys: vec!["a".to_string()],
        export_keys: vec!["b".to_string()],
        inherit: true,
        output_key: "b",
    };
    let s3 = TestService {
        name: "s3",
        cost: 2,
        is_end: false,
        require_keys: vec!["a".to_string()],
        export_keys: vec!["c".to_string()],
        inherit: true,
        output_key: "c",
    };
    let target = TestService {
        name: "t",
        cost: 1,
        is_end: true,
        require_keys: vec!["c".to_string()],
        export_keys: vec!["t".to_string()],
        inherit: true,
        output_key: "t",
    };

    let services: Vec<Box<dyn Service>> = vec![
        Box::new(s1),
        Box::new(s2),
        Box::new(s3),
        Box::new(target),
    ];
    let input = WorkflowValues::from_json_trusted(serde_json::json!({}), "test");

    let plan = plan_method(services, input, "t").await.expect("plan");
    let names: Vec<String> = plan.iter().map(|s| s.get_info().name).collect();

    assert_eq!(names, vec!["s1".to_string(), "s3".to_string(), "t".to_string()]);
    });
}

#[test]
fn test_plan_method_inherit_keeps_input_keys() {
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .expect("runtime");
    runtime.block_on(async {
    let s1 = TestService {
        name: "s1",
        cost: 1,
        is_end: false,
        require_keys: vec!["base".to_string()],
        export_keys: vec!["a".to_string()],
        inherit: true,
        output_key: "a",
    };
    let s2 = TestService {
        name: "s2",
        cost: 1,
        is_end: false,
        require_keys: vec!["base".to_string(), "a".to_string()],
        export_keys: vec!["b".to_string()],
        inherit: true,
        output_key: "b",
    };
    let target = TestService {
        name: "t",
        cost: 1,
        is_end: true,
        require_keys: vec!["b".to_string()],
        export_keys: vec!["t".to_string()],
        inherit: true,
        output_key: "t",
    };

    let services: Vec<Box<dyn Service>> = vec![
        Box::new(s1),
        Box::new(s2),
        Box::new(target),
    ];
    let input = WorkflowValues::from_json_trusted(serde_json::json!({"base": 1}), "test");

    let plan = plan_method(services, input, "t").await.expect("plan");
    let names: Vec<String> = plan.iter().map(|s| s.get_info().name).collect();

    assert_eq!(names, vec!["s1".to_string(), "s2".to_string(), "t".to_string()]);
    });
}

#[test]
fn test_status_inherit_merge_vs_replace() {
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .expect("runtime");
    runtime.block_on(async {
    let merge_service = TestService {
        name: "merge",
        cost: 1,
        is_end: true,
        require_keys: vec![],
        export_keys: vec!["b".to_string()],
        inherit: true,
        output_key: "b",
    };
    let replace_service = TestService {
        name: "replace",
        cost: 1,
        is_end: true,
        require_keys: vec![],
        export_keys: vec!["b".to_string()],
        inherit: false,
        output_key: "b",
    };

    let base = WorkflowValues::from_json_trusted(serde_json::json!({"a": 1}), "base");
    let now = make_now_status(base.clone());

    let system = TestSystem::default();

    let merged_service: Box<dyn Service<WorkflowValues>> = Box::new(merge_service);
    let merged = system.next(&now, &merged_service).await.expect("merged");
    assert!(merged.init_value.get_value("a").is_some());
    assert!(merged.init_value.get_value("b").is_some());

    let replaced_service: Box<dyn Service<WorkflowValues>> = Box::new(replace_service);
    let replaced = system.next(&now, &replaced_service).await.expect("replaced");
    assert!(replaced.init_value.get_value("a").is_none());
    assert!(replaced.init_value.get_value("b").is_some());
    });
}

#[test]
fn test_extra_start_points() {
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .expect("runtime");
    runtime.block_on(async {
    let start = TestService {
        name: "start",
        cost: 1,
        is_end: false,
        require_keys: vec![],
        export_keys: vec!["a".to_string()],
        inherit: true,
        output_key: "a",
    };
    let mid1 = TestService {
        name: "mid1",
        cost: 1,
        is_end: false,
        require_keys: vec!["a".to_string()],
        export_keys: vec!["b".to_string()],
        inherit: true,
        output_key: "b",
    };
    let mid2 = TestService {
        name: "mid2",
        cost: 1,
        is_end: false,
        require_keys: vec!["x".to_string()],
        export_keys: vec!["c".to_string()],
        inherit: true,
        output_key: "c",
    };
    let target = TestService {
        name: "target",
        cost: 1,
        is_end: true,
        require_keys: vec!["b".to_string(), "c".to_string()],
        export_keys: vec!["done".to_string()],
        inherit: true,
        output_key: "done",
    };

    let services: Vec<Box<dyn Service>> = vec![
        Box::new(start),
        Box::new(mid1),
        Box::new(mid2),
        Box::new(target),
    ];

    let extra = extra_start_points(services, "start", "target").await;
    let names: Vec<String> = extra
        .iter()
        .map(|r| r.start_service_info.name.clone())
        .collect();

    assert_eq!(names, vec!["mid2".to_string()]);
    });
}

// ============================================================================
// inner_key 相关测试
// ============================================================================

/// 测试 inner_key export 可以满足 inner_key require
/// 场景: s1 导出 inner:a, target 要求 inner:a
#[test]
fn test_plan_method_inner_key_export_satisfies_inner_key_require() {
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .expect("runtime");
    runtime.block_on(async {
    let s1 = TestService {
        name: "s1",
        cost: 1,
        is_end: false,
        require_keys: vec![],
        export_keys: vec!["inner:a".to_string()],
        inherit: true,
        output_key: "a",
    };
    let target = TestService {
        name: "t",
        cost: 1,
        is_end: true,
        require_keys: vec!["inner:a".to_string()],
        export_keys: vec!["result".to_string()],
        inherit: true,
        output_key: "result",
    };

    let services: Vec<Box<dyn Service>> = vec![
        Box::new(s1),
        Box::new(target),
    ];
    let input = WorkflowValues::from_json_trusted(serde_json::json!({}), "test");

    let plan = plan_method(services, input, "t").await.expect("plan should find a path");
    let names: Vec<String> = plan.iter().map(|s| s.get_info().name).collect();
    assert_eq!(names, vec!["s1".to_string(), "t".to_string()]);
    });
}

/// 测试 inner_key export 也使得 plain key 可用
/// 场景: s1 导出 inner:a, target 要求 a (不带 inner: 前缀)
#[test]
fn test_plan_method_inner_key_export_also_provides_plain_key() {
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .expect("runtime");
    runtime.block_on(async {
    let s1 = TestService {
        name: "s1",
        cost: 1,
        is_end: false,
        require_keys: vec![],
        export_keys: vec!["inner:handle".to_string(), "inner:platform".to_string()],
        inherit: true,
        output_key: "handle",
    };
    let target = TestService {
        name: "t",
        cost: 1,
        is_end: true,
        require_keys: vec!["handle".to_string(), "platform".to_string()],
        export_keys: vec!["done".to_string()],
        inherit: true,
        output_key: "done",
    };

    let services: Vec<Box<dyn Service>> = vec![
        Box::new(s1),
        Box::new(target),
    ];
    let input = WorkflowValues::from_json_trusted(serde_json::json!({}), "test");

    let plan = plan_method(services, input, "t").await.expect("plan should find a path");
    let names: Vec<String> = plan.iter().map(|s| s.get_info().name).collect();
    assert_eq!(names, vec!["s1".to_string(), "t".to_string()]);
    });
}

/// 测试混合 inner_key 和 plain key 的链式规划
/// 场景: from_node 导出 inner:handle, inner:platform, inner:token
///        remote_service 要求 inner:handle, inner:token 并导出 inner:submissions
///        end_service 要求 inner:submissions
#[test]
fn test_plan_method_inner_key_chain() {
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .expect("runtime");
    runtime.block_on(async {
    let from_node = TestService {
        name: "from_node",
        cost: 1,
        is_end: false,
        require_keys: vec!["vjudge_id".to_string()],
        export_keys: vec![
            "inner:handle".to_string(),
            "inner:platform".to_string(),
            "inner:token".to_string(),
        ],
        inherit: true,
        output_key: "handle",
    };
    let remote_sync = TestService {
        name: "remote_sync",
        cost: 5,
        is_end: false,
        require_keys: vec!["inner:handle".to_string(), "inner:token".to_string()],
        export_keys: vec!["inner:submissions".to_string()],
        inherit: true,
        output_key: "submissions",
    };
    let sync_end = TestService {
        name: "sync_end",
        cost: 1,
        is_end: true,
        require_keys: vec!["inner:submissions".to_string()],
        export_keys: vec!["task_done".to_string()],
        inherit: true,
        output_key: "task_done",
    };

    let services: Vec<Box<dyn Service>> = vec![
        Box::new(from_node),
        Box::new(remote_sync),
        Box::new(sync_end),
    ];
    let input = WorkflowValues::from_json_trusted(
        serde_json::json!({"vjudge_id": 123}),
        "test",
    );

    let plan = plan_method(services, input, "sync_end").await.expect("plan should find a path");
    let names: Vec<String> = plan.iter().map(|s| s.get_info().name).collect();
    assert_eq!(names, vec!["from_node".to_string(), "remote_sync".to_string(), "sync_end".to_string()]);
    });
}

/// 测试 inner_key require 在没有 inner export 时无法被满足
/// 场景: s1 导出 a (非 inner), target 要求 inner:a
/// 由于 plain export 不保证可信, inner:a 不应自动满足
#[test]
fn test_plan_method_plain_export_does_not_satisfy_inner_require() {
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .expect("runtime");
    runtime.block_on(async {
    let s1 = TestService {
        name: "s1",
        cost: 1,
        is_end: false,
        require_keys: vec![],
        export_keys: vec!["a".to_string()],
        inherit: true,
        output_key: "a",
    };
    let target = TestService {
        name: "t",
        cost: 1,
        is_end: true,
        require_keys: vec!["inner:a".to_string()],
        export_keys: vec!["done".to_string()],
        inherit: true,
        output_key: "done",
    };

    let services: Vec<Box<dyn Service>> = vec![
        Box::new(s1),
        Box::new(target),
    ];
    let input = WorkflowValues::from_json_trusted(serde_json::json!({}), "test");

    let plan = plan_method(services, input, "t").await;
    assert!(plan.is_none(), "plain export should NOT satisfy inner: require");
    });
}

/// 测试带 inherit=false 的 inner_key 行为
/// 场景: s1 导出 inner:a, s2(inherit=false) 要求 inner:a 并导出 inner:b
///        由于 s2 不继承, s2 后的 key set 仅包含 inner:b
///        target 要求 inner:a + inner:b, 但 s1 不是无条件可用的（它要求 x）
///        所以不可能在 s2 之后再次运行 s1
#[test]
fn test_plan_method_inner_key_no_inherit() {
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .expect("runtime");
    runtime.block_on(async {
    let s1 = TestService {
        name: "s1",
        cost: 1,
        is_end: false,
        require_keys: vec!["x".to_string()], // 需要 x，不是无条件的
        export_keys: vec!["inner:a".to_string()],
        inherit: true,
        output_key: "a",
    };
    let s2 = TestService {
        name: "s2",
        cost: 1,
        is_end: false,
        require_keys: vec!["inner:a".to_string()],
        export_keys: vec!["inner:b".to_string()],
        inherit: false, // Does NOT inherit previous keys
        output_key: "b",
    };
    let target = TestService {
        name: "t",
        cost: 1,
        is_end: true,
        require_keys: vec!["inner:a".to_string(), "inner:b".to_string()],
        export_keys: vec!["done".to_string()],
        inherit: true,
        output_key: "done",
    };

    let services: Vec<Box<dyn Service>> = vec![
        Box::new(s1),
        Box::new(s2),
        Box::new(target),
    ];
    // input has x so s1 can run, but after s2(inherit=false) x is lost and s1 can't re-run
    let input = WorkflowValues::from_json_trusted(serde_json::json!({"x": 1}), "test");

    // s2 doesn't inherit, so after s2 only inner:b is available, not inner:a
    // target requires both inner:a and inner:b, which can't be satisfied
    // s1 can't re-run because x is no longer available after s2
    let plan = plan_method(services, input, "t").await;
    assert!(plan.is_none(), "inherit=false should drop previous keys");
    });
}

/// 测试 NowStatus 的状态管理方法
#[test]
fn test_now_status_methods() {
    let values = WorkflowValues::from_json_trusted(serde_json::json!({}), "test");

    // Test NotStart
    let status = NowStatus {
        done: false,
        status: TaskStatus::NotStart,
        init_value: values.clone(),
        is_lazy: false,
        task_id: Some(1),
        history_value: vec![],
    };
    assert!(!status.is_done());
    assert!(!status.is_running());
    assert!(!status.is_failed());
    assert!(!status.is_cancelled());

    // Test Running
    let status = NowStatus {
        done: false,
        status: TaskStatus::Running,
        init_value: values.clone(),
        is_lazy: false,
        task_id: Some(1),
        history_value: vec![],
    };
    assert!(!status.is_done());
    assert!(status.is_running());

    // Test Success
    let status = NowStatus {
        done: true,
        status: TaskStatus::Success,
        init_value: values.clone(),
        is_lazy: false,
        task_id: Some(1),
        history_value: vec![],
    };
    assert!(status.is_done());

    // Test Failed
    let status = NowStatus {
        done: false,
        status: TaskStatus::Failed,
        init_value: values.clone(),
        is_lazy: false,
        task_id: Some(1),
        history_value: vec![],
    };
    assert!(status.is_done()); // Failed means done
    assert!(status.is_failed());

    // Test Cancelled
    let status = NowStatus {
        done: false,
        status: TaskStatus::OtherStatus("Cancelled".to_string()),
        init_value: values.clone(),
        is_lazy: false,
        task_id: Some(1),
        history_value: vec![],
    };
    assert!(status.is_cancelled());
}

/// 测试 TaskStatus::from 转换
#[test]
fn test_task_status_from_string() {
    assert_eq!(TaskStatus::from("NotStart".to_string()), TaskStatus::NotStart);
    assert_eq!(TaskStatus::from("Running".to_string()), TaskStatus::Running);
    assert_eq!(TaskStatus::from("Success".to_string()), TaskStatus::Success);
    assert_eq!(TaskStatus::from("Failed".to_string()), TaskStatus::Failed);
    assert_eq!(TaskStatus::from("NoMethod".to_string()), TaskStatus::NoMethod);
    assert_eq!(TaskStatus::from("CustomStatus".to_string()), TaskStatus::OtherStatus("CustomStatus".to_string()));
}

/// 测试 WorkflowAction::next 正确设置状态
#[test]
fn test_workflow_action_next_sets_status() {
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .expect("runtime");
    runtime.block_on(async {
    let service = TestService {
        name: "non_end",
        cost: 1,
        is_end: false,
        require_keys: vec![],
        export_keys: vec!["b".to_string()],
        inherit: true,
        output_key: "b",
    };

    let base = WorkflowValues::from_json_trusted(serde_json::json!({"a": 1}), "base");
    let now = make_now_status(base.clone());

    let system = TestSystem::default();
    let svc: Box<dyn Service<WorkflowValues>> = Box::new(service);
    let result = system.next(&now, &svc).await.expect("should succeed");

    // Non-end service should set status to Running
    assert_eq!(result.status, TaskStatus::Running);
    assert!(!result.done);
    });
}

/// 测试 WorkflowAction::next 对 end service 设置 Success 状态
#[test]
fn test_workflow_action_next_end_service_sets_success() {
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .expect("runtime");
    runtime.block_on(async {
    let service = TestService {
        name: "end_svc",
        cost: 1,
        is_end: true,
        require_keys: vec![],
        export_keys: vec!["b".to_string()],
        inherit: true,
        output_key: "b",
    };

    let base = WorkflowValues::from_json_trusted(serde_json::json!({"a": 1}), "base");
    let now = make_now_status(base.clone());

    let system = TestSystem::default();
    let svc: Box<dyn Service<WorkflowValues>> = Box::new(service);
    let result = system.next(&now, &svc).await.expect("should succeed");

    // End service should set status to Success
    assert_eq!(result.status, TaskStatus::Success);
    assert!(result.done);
    });
}

// ============================================================================
// WorkflowStatus / Final 状态测试
// ============================================================================

/// 可以返回 Final(Failed) 的测试服务
#[derive(Clone)]
struct FailingTestService {
    name: &'static str,
    error_msg: &'static str,
    require_keys: Vec<String>,
    export_keys: Vec<String>,
}

#[async_trait(?Send)]
impl Service for FailingTestService {
    fn is_end(&self) -> bool { false }
    fn get_info(&self) -> ServiceInfo {
        ServiceInfo {
            name: self.name.to_string(),
            description: "failing test service".to_string(),
            allow_description: "".to_string(),
        }
    }
    fn get_cost(&self) -> i32 { 1 }
    fn get_import_require(&self) -> Box<dyn StatusRequire> {
        let mut require = WorkflowRequire::new();
        for key in &self.require_keys {
            require = require.with_key(key.clone());
        }
        Box::new(require)
    }
    fn get_export_describe(&self) -> Vec<Box<dyn StatusDescribe>> {
        let mut export = WorkflowExportDescribe::new();
        for key in &self.export_keys {
            export = export.add_has(key.clone());
        }
        vec![Box::new(export)]
    }
    async fn verify(&self, input: &WorkflowValues) -> bool {
        self.require_keys.iter().all(|key| input.get_value(key).is_some())
    }
    async fn execute(&self, _input: &WorkflowValues) -> WorkflowValues {
        // 返回 Final(Failed) 状态
        WorkflowValues::final_status(WorkflowStatus::failed(self.error_msg))
    }
}

/// 可以返回 Final(Completed) 的测试服务
#[derive(Clone)]
struct CompletingTestService {
    name: &'static str,
    message: &'static str,
}

#[async_trait(?Send)]
impl Service for CompletingTestService {
    fn is_end(&self) -> bool { true }
    fn get_info(&self) -> ServiceInfo {
        ServiceInfo {
            name: self.name.to_string(),
            description: "completing test service".to_string(),
            allow_description: "".to_string(),
        }
    }
    fn get_cost(&self) -> i32 { 1 }
    fn get_import_require(&self) -> Box<dyn StatusRequire> {
        Box::new(WorkflowRequire::new())
    }
    fn get_export_describe(&self) -> Vec<Box<dyn StatusDescribe>> {
        vec![Box::new(WorkflowExportDescribe::new().add_has("done"))]
    }
    async fn verify(&self, _input: &WorkflowValues) -> bool { true }
    async fn execute(&self, _input: &WorkflowValues) -> WorkflowValues {
        let values = WorkflowValues::from_json_trusted(
            serde_json::json!({"done": true}),
            self.name,
        );
        WorkflowValues::final_status(WorkflowStatus::completed(values, Some(self.message.to_string())))
    }
}

/// 测试 WorkflowValues::is_failed_final / export_task_status
#[test]
fn test_workflow_values_final_status_methods() {
    // Normal values
    let values = WorkflowValues::from_json_trusted(serde_json::json!({"a": 1}), "test");
    assert!(!values.is_failed_final());
    assert!(!values.is_completed_final());
    assert!(values.get_final_status().is_none());
    assert_eq!(values.export_task_status(), "running");
    assert!(values.final_error().is_none());

    // Final(Failed)
    let failed = WorkflowValues::final_status(WorkflowStatus::failed("test error"));
    assert!(failed.is_failed_final());
    assert!(!failed.is_completed_final());
    assert!(failed.get_final_status().is_some());
    assert_eq!(failed.export_task_status(), "failed");
    assert_eq!(failed.final_error(), Some("test error"));

    // Final(Completed)
    let completed = WorkflowValues::final_status(
        WorkflowStatus::completed(WorkflowValues::new(), Some("done".to_string()))
    );
    assert!(!completed.is_failed_final());
    assert!(completed.is_completed_final());
    assert_eq!(completed.export_task_status(), "completed");
    assert!(completed.final_error().is_none());

    // Final(Running) — edge case
    let running = WorkflowValues::final_status(WorkflowStatus::running(WorkflowValues::new()));
    assert!(!running.is_failed_final());
    assert!(!running.is_completed_final());
    assert_eq!(running.export_task_status(), "running");
}

/// 测试 Status trait 的 is_final_failed / export_task_status 方法
#[test]
fn test_status_trait_final_methods() {
    // WorkflowValues (normal) - trait methods
    let values: Box<dyn Status> = Box::new(
        WorkflowValues::from_json_trusted(serde_json::json!({"x": 1}), "test")
    );
    assert!(!values.is_final_failed());
    assert_eq!(values.export_task_status(), "running");
    assert!(values.final_error_message().is_none());

    // WorkflowValues (Final(Failed)) - trait methods
    let failed: Box<dyn Status> = Box::new(
        WorkflowValues::final_status(WorkflowStatus::failed("boom"))
    );
    assert!(failed.is_final_failed());
    assert_eq!(failed.export_task_status(), "failed");
    assert_eq!(failed.final_error_message(), Some("boom".to_string()));

    // WorkflowStatus directly - trait methods
    let ws_failed: Box<dyn Status> = Box::new(WorkflowStatus::failed("crash"));
    assert!(ws_failed.is_final_failed());
    assert_eq!(ws_failed.export_task_status(), "failed");
    assert_eq!(ws_failed.final_error_message(), Some("crash".to_string()));

    let ws_completed: Box<dyn Status> = Box::new(
        WorkflowStatus::completed(WorkflowValues::new(), None)
    );
    assert!(!ws_completed.is_final_failed());
    assert_eq!(ws_completed.export_task_status(), "completed");

    // serde_json::Value (default impl)
    let json_status: Box<dyn Status> = Box::new(serde_json::json!({"a": 1}));
    assert!(!json_status.is_final_failed());
    assert_eq!(json_status.export_task_status(), "running");
}

/// 测试当服务返回 Final(Failed) 时，next() 应立即返回 Failed 状态
#[test]
fn test_next_with_failing_service_exits_immediately() {
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .expect("runtime");
    runtime.block_on(async {
    let failing = FailingTestService {
        name: "fail_svc",
        error_msg: "Something went wrong",
        require_keys: vec![],
        export_keys: vec!["x".to_string()],
    };

    let base = WorkflowValues::from_json_trusted(serde_json::json!({"a": 1}), "base");
    let now = make_now_status(base);

    let system = TestSystem::default();
    let svc: Box<dyn Service<WorkflowValues>> = Box::new(failing);
    let result = system.next(&now, &svc).await.expect("should return Some (failed status)");

    // 服务返回 Failed，next() 应该设置 TaskStatus::Failed 并标记 done
    assert_eq!(result.status, TaskStatus::Failed);
    assert!(result.done);
    // init_value 应该是 Final(Failed)
    assert!(result.init_value.is_failed_final());
    assert_eq!(result.init_value.final_error(), Some("Something went wrong"));
    });
}

/// 测试 execute() 在遇到 Failed 服务时及时退出
#[test]
fn test_execute_exits_on_failed_service() {
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .expect("runtime");
    runtime.block_on(async {
    // s1 正常，会导出 "a"
    let s1 = TestService {
        name: "s1",
        cost: 1,
        is_end: false,
        require_keys: vec![],
        export_keys: vec!["a".to_string()],
        inherit: true,
        output_key: "a",
    };
    // fail_svc 会返回 Failed
    let fail_svc = FailingTestService {
        name: "fail_svc",
        error_msg: "Task failed in the middle",
        require_keys: vec!["a".to_string()],
        export_keys: vec!["b".to_string()],
    };
    // target 永远不应该被执行到
    let target = TestService {
        name: "target",
        cost: 1,
        is_end: true,
        require_keys: vec!["b".to_string()],
        export_keys: vec!["done".to_string()],
        inherit: true,
        output_key: "done",
    };

    // 创建一个包含服务的系统
    struct FailTestSystem {
        services: Vec<Box<dyn Service>>,
    }

    #[async_trait(?Send)]
    impl workflow::workflow::WorkflowSystem for FailTestSystem {
        const NAME: &'static str = "fail_test";
        const LINK: &'static str = "/";
        const DESCRIPTION: &'static str = "test";
        async fn get_all_services(&self) -> Vec<Box<dyn Service>> {
            self.services.iter().map(|s| s.clone()).collect()
        }
        async fn update_execute_status(&self, _task_id: i64, _status: &NowStatus) -> Option<()> {
            Some(())
        }
        async fn get_service(&self, name: &str) -> Option<Box<dyn Service>> {
            self.services.iter().find(|s| s.get_info().name == name).cloned()
        }
        async fn register_service(&mut self, _service: Box<dyn Service>) {}
        async fn deregister_service(&mut self, _service_name: &str) {}
        async fn generate_task_id(&self, _service: &str) -> i64 { 1 }
    }

    let system = FailTestSystem {
        services: vec![
            Box::new(s1),
            Box::new(fail_svc),
            Box::new(target.clone()),
        ],
    };

    let base = WorkflowValues::from_json_trusted(serde_json::json!({}), "test");
    let now = make_now_status(base);

    let target_svc: Box<dyn Service> = Box::new(target);
    let result = system.execute(&now, target_svc).await;
    let result = result.expect("should return Some");

    // execute 应该以 Failed 状态退出
    assert_eq!(result.status, TaskStatus::Failed);
    assert!(result.done);
    });
}

/// 测试 WorkflowStatus Default 实现
#[test]
fn test_workflow_status_default() {
    let status = WorkflowStatus::default();
    assert!(status.is_running());
    assert!(!status.is_completed());
    assert!(!status.is_failed());
    assert!(status.values().is_some());
    assert!(status.values().unwrap().is_empty());
}

// ============================================================================
// 死循环检测测试
// ============================================================================

/// 服务每次都输出相同的 key，导致 key 集合不变 → 应被死循环检测终止
#[derive(Clone)]
struct StagnantService {
    name: &'static str,
    cost: i32,
    is_end: bool,
    require_keys: Vec<String>,
    export_keys: Vec<String>,
}

#[async_trait(?Send)]
impl Service for StagnantService {
    fn is_end(&self) -> bool { self.is_end }
    fn get_info(&self) -> ServiceInfo {
        ServiceInfo {
            name: self.name.to_string(),
            description: "stagnant".to_string(),
            allow_description: "".to_string(),
        }
    }
    fn get_cost(&self) -> i32 { self.cost }
    fn get_import_require(&self) -> Box<dyn StatusRequire> {
        let mut require = WorkflowRequire::new();
        for key in &self.require_keys {
            require = require.with_key(key.clone());
        }
        Box::new(require)
    }
    fn get_export_describe(&self) -> Vec<Box<dyn StatusDescribe>> {
        let mut export = WorkflowExportDescribe::new();
        for key in &self.export_keys {
            export = export.add_has(key.clone());
        }
        vec![Box::new(export)]
    }
    fn inherit_status(&self) -> bool { true }
    async fn verify(&self, input: &WorkflowValues) -> bool {
        self.require_keys.iter().all(|key| input.get_value(key).is_some())
    }
    // 每次输出相同的 key/value —— 不增加任何新信息
    async fn execute(&self, _input: &WorkflowValues) -> WorkflowValues {
        WorkflowValues::from_json_trusted(
            serde_json::json!({ "stagnant_key": "same_value" }),
            self.name,
        )
    }
}

/// 测试: 同一服务连续被选中 → 死循环检测触发 → 返回 Failed
#[test]
fn test_death_loop_same_service_detected() {
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .expect("runtime");
    runtime.block_on(async {
    // stagnant: 不需要任何输入，导出 stagnant_key，但 target 需要 other_key
    // plan_method 每次都选 stagnant（因为它是唯一可执行的非 end 服务）
    // 但 stagnant 不产出 other_key，所以计划永远无法完成
    // key 不变化 → stagnant_count 增长 → 死循环检测触发
    let stagnant = StagnantService {
        name: "stagnant",
        cost: 1,
        is_end: false,
        require_keys: vec![],
        export_keys: vec!["stagnant_key".to_string()],
    };
    let target = TestService {
        name: "target",
        cost: 1,
        is_end: true,
        require_keys: vec!["stagnant_key".to_string(), "other_key".to_string()],
        export_keys: vec!["done".to_string()],
        inherit: true,
        output_key: "done",
    };

    struct DeathLoopSystem {
        services: Vec<Box<dyn Service>>,
    }

    #[async_trait(?Send)]
    impl workflow::workflow::WorkflowSystem for DeathLoopSystem {
        const NAME: &'static str = "death_loop_test";
        const LINK: &'static str = "/";
        const DESCRIPTION: &'static str = "test";
        async fn get_all_services(&self) -> Vec<Box<dyn Service>> {
            self.services.iter().map(|s| s.clone()).collect()
        }
        async fn update_execute_status(&self, _task_id: i64, _status: &NowStatus) -> Option<()> {
            Some(())
        }
        async fn get_service(&self, name: &str) -> Option<Box<dyn Service>> {
            self.services.iter().find(|s| s.get_info().name == name).cloned()
        }
        async fn register_service(&mut self, _service: Box<dyn Service>) {}
        async fn deregister_service(&mut self, _service_name: &str) {}
        async fn generate_task_id(&self, _service: &str) -> i64 { 1 }
    }

    let system = DeathLoopSystem {
        services: vec![
            Box::new(stagnant),
            Box::new(target.clone()),
        ],
    };

    let base = WorkflowValues::from_json_trusted(serde_json::json!({}), "test");
    let now = make_now_status(base);

    let target_svc: Box<dyn Service> = Box::new(target);
    let result = system.execute(&now, target_svc).await;
    let result = result.expect("should return Some");

    // 应该因死循环检测返回 Failed
    assert_eq!(result.status, TaskStatus::Failed);
    assert!(result.done);
    });
}

/// 测试: key 集合停滞检测（连续多轮 key 不变化）
#[test]
fn test_death_loop_key_stagnation_detected() {
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .expect("runtime");
    runtime.block_on(async {
    // 两个服务交替可选，但每次执行都不改变 key 集合
    // 服务 a 需要 "x"，导出 "x"（已存在 → 无新信息）
    let service_a = StagnantService {
        name: "svc_a",
        cost: 1,
        is_end: false,
        require_keys: vec!["x".to_string()],
        export_keys: vec!["x".to_string()],
    };
    let target = TestService {
        name: "target",
        cost: 1,
        is_end: true,
        require_keys: vec!["x".to_string(), "y".to_string()],
        export_keys: vec!["done".to_string()],
        inherit: true,
        output_key: "done",
    };

    struct StagnantSystem {
        services: Vec<Box<dyn Service>>,
    }

    #[async_trait(?Send)]
    impl workflow::workflow::WorkflowSystem for StagnantSystem {
        const NAME: &'static str = "stagnant_test";
        const LINK: &'static str = "/";
        const DESCRIPTION: &'static str = "test";
        async fn get_all_services(&self) -> Vec<Box<dyn Service>> {
            self.services.iter().map(|s| s.clone()).collect()
        }
        async fn update_execute_status(&self, _task_id: i64, _status: &NowStatus) -> Option<()> {
            Some(())
        }
        async fn get_service(&self, name: &str) -> Option<Box<dyn Service>> {
            self.services.iter().find(|s| s.get_info().name == name).cloned()
        }
        async fn register_service(&mut self, _service: Box<dyn Service>) {}
        async fn deregister_service(&mut self, _service_name: &str) {}
        async fn generate_task_id(&self, _service: &str) -> i64 { 1 }
    }

    let system = StagnantSystem {
        services: vec![
            Box::new(service_a),
            Box::new(target.clone()),
        ],
    };

    let base = WorkflowValues::from_json_trusted(serde_json::json!({"x": 1}), "test");
    let now = make_now_status(base);

    let target_svc: Box<dyn Service> = Box::new(target);
    let result = system.execute(&now, target_svc).await;
    let result = result.expect("should return Some");

    // 因 key 停滞检测返回 Failed
    assert_eq!(result.status, TaskStatus::Failed);
    assert!(result.done);
    });
}

/// 测试: 正常执行流程不被死循环检测误杀
#[test]
fn test_normal_execution_not_affected_by_loop_detection() {
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .expect("runtime");
    runtime.block_on(async {
    let s1 = TestService {
        name: "s1",
        cost: 1,
        is_end: false,
        require_keys: vec![],
        export_keys: vec!["a".to_string()],
        inherit: true,
        output_key: "a",
    };
    let s2 = TestService {
        name: "s2",
        cost: 1,
        is_end: false,
        require_keys: vec!["a".to_string()],
        export_keys: vec!["b".to_string()],
        inherit: true,
        output_key: "b",
    };
    let target = TestService {
        name: "target",
        cost: 1,
        is_end: true,
        require_keys: vec!["b".to_string()],
        export_keys: vec!["done".to_string()],
        inherit: true,
        output_key: "done",
    };

    struct NormalSystem {
        services: Vec<Box<dyn Service>>,
    }

    #[async_trait(?Send)]
    impl workflow::workflow::WorkflowSystem for NormalSystem {
        const NAME: &'static str = "normal_test";
        const LINK: &'static str = "/";
        const DESCRIPTION: &'static str = "test";
        async fn get_all_services(&self) -> Vec<Box<dyn Service>> {
            self.services.iter().map(|s| s.clone()).collect()
        }
        async fn update_execute_status(&self, _task_id: i64, _status: &NowStatus) -> Option<()> {
            Some(())
        }
        async fn get_service(&self, name: &str) -> Option<Box<dyn Service>> {
            self.services.iter().find(|s| s.get_info().name == name).cloned()
        }
        async fn register_service(&mut self, _service: Box<dyn Service>) {}
        async fn deregister_service(&mut self, _service_name: &str) {}
        async fn generate_task_id(&self, _service: &str) -> i64 { 1 }
    }

    let system = NormalSystem {
        services: vec![
            Box::new(s1),
            Box::new(s2),
            Box::new(target.clone()),
        ],
    };

    let base = WorkflowValues::from_json_trusted(serde_json::json!({}), "test");
    let now = make_now_status(base);

    let target_svc: Box<dyn Service> = Box::new(target);
    let result = system.execute(&now, target_svc).await;
    let result = result.expect("should return Some");

    // 正常执行应该成功完成
    assert_eq!(result.status, TaskStatus::Success);
    assert!(result.done);
    // 应该包含所有中间结果
    assert!(result.init_value.get_value("a").is_some());
    assert!(result.init_value.get_value("b").is_some());
    });
}
