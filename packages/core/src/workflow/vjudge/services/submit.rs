//! Submit Service - 代码提交工作流服务
//!
//! 将代码提交到远程 OJ 平台，集成 JudgeService 配置

use std::collections::HashMap;
use async_trait::async_trait;
use workflow::description::{WorkflowExportDescribe, WorkflowRequire};
use workflow::workflow::{Service, ServiceInfo, Status, StatusDescribe, StatusRequire, Value};
use workflow::value::{BaseValue, WorkflowValue};
use workflow::status::{WorkflowValues, WorkflowStatus};

use crate::service::judge::service::get_tool;

/// 提交服务 - 将代码提交到远程平台
///
/// 这是一个远程服务代理，实际执行由边缘服务完成
/// 此服务负责：
/// 1. 验证提交参数（语言、选项、代码）
/// 2. 构建提交任务数据
/// 3. 将任务发送到边缘服务
#[derive(Clone)]
pub struct SubmitService {
    /// 平台名称 (codeforces, atcoder, luogu, etc.)
    platform: String,
}

impl SubmitService {
    pub fn new(platform: impl Into<String>) -> Self {
        Self {
            platform: platform.into(),
        }
    }

    /// 获取支持的平台列表
    pub fn supported_platforms() -> Vec<&'static str> {
        vec!["codeforces", "atcoder", "luogu"]
    }

    /// 构建提交任务数据
    ///
    /// 从 Status 中提取必要信息，构建发送给边缘服务的任务
    fn build_submit_task(&self, input: &dyn Status) -> Result<SubmitTaskData, String> {
        // 获取必要参数 - 使用 to_string() 因为 Value trait 只有这个方法
        let code = value_as_string(
            input
                .get_value("code")
                .ok_or("Missing required field: code")?,
        );

        let language = value_as_string(
            input
                .get_value("language")
                .ok_or("Missing required field: language")?,
        );

        let user_id: i64 = input
            .get_value("user_id")
            .map(value_as_i64)
            .unwrap_or(0);

        let record_id: i64 = input
            .get_value("record_id")
            .map(value_as_i64)
            .unwrap_or(0);

        // 获取 VJudge 账号信息
        let vjudge_account_id: i64 = input
            .get_value("vjudge_account_id")
            .map(value_as_i64)
            .unwrap_or(0);

        // 获取编译/路由选项
        let options = self.extract_options(input);

        // 获取平台特定选项（如 contest_id, problem_id）
        let contest_id = input.get_value("contest_id").map(value_as_string);
        let problem_id = input.get_value("problem_id").map(value_as_string);

        Ok(SubmitTaskData {
            platform: self.platform.clone(),
            operation: "submit".to_string(),
            code,
            language,
            user_id,
            record_id,
            vjudge_account_id,
            contest_id,
            problem_id,
            options,
        })
    }

    /// 从 Status 中提取编译选项
    fn extract_options(&self, input: &dyn Status) -> HashMap<String, String> {
        let mut options = HashMap::new();

        // 尝试获取 compile_options 字段
        if let Some(opts) = input.get_value("compile_options") {
            let raw = opts.to_string();
            if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&raw) {
                match parsed {
                    serde_json::Value::Array(items) => {
                        for item in items {
                            if let Some(item_str) = item.as_str() {
                                parse_option_kv(item_str, &mut options);
                            }
                        }
                    }
                    serde_json::Value::String(item_str) => {
                        parse_option_kv(&item_str, &mut options);
                    }
                    _ => {}
                }
            } else {
                // 兼容 "[key=value, key=value]" 格式
                for item in raw.trim_matches(|c| c == '[' || c == ']').split(", ") {
                    parse_option_kv(item, &mut options);
                }
            }
        }

        options
    }
}

/// 提交任务数据结构
#[derive(Debug, Clone)]
pub struct SubmitTaskData {
    pub platform: String,
    pub operation: String,
    pub code: String,
    pub language: String,
    pub user_id: i64,
    pub record_id: i64,
    pub vjudge_account_id: i64,
    pub contest_id: Option<String>,
    pub problem_id: Option<String>,
    pub options: HashMap<String, String>,
}

impl SubmitTaskData {
    /// 转换为 JSON 字符串
    pub fn to_json(&self) -> String {
        serde_json::to_string(&serde_json::json!({
            "platform": self.platform,
            "operation": self.operation,
            "code": self.code,
            "language": self.language,
            "user_id": self.user_id,
            "record_id": self.record_id,
            "vjudge_account_id": self.vjudge_account_id,
            "contest_id": self.contest_id,
            "problem_id": self.problem_id,
            "options": self.options,
        }))
        .unwrap_or_else(|_| "{}".to_string())
    }
}

#[async_trait(?Send)]
impl Service for SubmitService {
    fn is_end(&self) -> bool {
        false // 提交后还需要等待评测结果
    }

    fn get_info(&self) -> ServiceInfo {
        ServiceInfo {
            name: format!("submit_{}", self.platform),
            description: format!("Submit code to {} platform", self.platform),
            allow_description: format!(
                "Requires verified {} account and problem information",
                self.platform
            ),
        }
    }

    fn get_cost(&self) -> i32 {
        // 提交通常需要 10-30 秒，设置较高的代价
        50
    }

    fn get_import_require(&self) -> Box<dyn StatusRequire> {
        Box::new(
            WorkflowRequire::new()
                .with_key("code")
                .with_key("language")
                .with_key("vjudge_account_id")
                .with_value("platform", self.platform.clone()),
        )
    }

    fn get_export_describe(&self) -> Vec<Box<dyn StatusDescribe>> {
        vec![Box::new(
            WorkflowExportDescribe::new()
                .add_has("submission_id")
                .add_has("submission_url")
                .add_has("submit_time"),
        )]
    }

    async fn verify(&self, input: &Box<dyn Status>) -> bool {
        // 验证必要字段存在
        let has_code = input.get_value("code").is_some();
        let has_language = input.get_value("language").is_some();
        let has_account = input.get_value("vjudge_account_id").is_some();
        let platform_ok = input
            .get_value("platform")
            .map(|v| value_as_string(v) == self.platform)
            .unwrap_or(false);

        has_code && has_language && has_account && platform_ok
    }

    async fn execute(&self, input: &Box<dyn Status>) -> Box<dyn Status> {
        // 构建提交任务
        let task_data = match self.build_submit_task(input.as_ref()) {
            Ok(data) => data,
            Err(e) => {
                return Box::new(WorkflowStatus::failed(format!(
                    "Failed to build submit task: {}",
                    e
                )));
            }
        };

        // TODO: 实际通过 RemoteEdgeService 发送任务
        // 这里返回一个占位状态
        Box::new(WorkflowValues::from_json_trusted(serde_json::json!({
            "platform": self.platform.clone(),
            "record_id": task_data.record_id,
            "submission_id": "pending"
        }), "submit"))
    }
}

/// 提交完成服务（本地终点）
///
/// 用于在提交任务完成后，落库/更新状态并作为终点收口。
#[derive(Clone)]
pub struct SubmitCompleteService;

impl SubmitCompleteService {
    pub fn new() -> Self {
        Self
    }
}

impl Default for SubmitCompleteService {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait(?Send)]
impl Service for SubmitCompleteService {
    fn is_end(&self) -> bool {
        true
    }

    fn get_info(&self) -> ServiceInfo {
        ServiceInfo {
            name: "submit_complete".to_string(),
            description: "Mark submit operation as complete".to_string(),
            allow_description: "Terminal state indicating successful submission".to_string(),
        }
    }

    fn get_cost(&self) -> i32 {
        0
    }

    fn get_import_require(&self) -> Box<dyn StatusRequire> {
        Box::new(WorkflowRequire::new().with_key("record_id"))
    }

    fn get_export_describe(&self) -> Vec<Box<dyn StatusDescribe>> {
        vec![Box::new(
            WorkflowExportDescribe::new()
                .add_has("record_id")
                .add_has("submission_id")
                .add_has("success"),
        )]
    }

    async fn verify(&self, input: &Box<dyn Status>) -> bool {
        input.get_value("record_id").is_some()
    }

    async fn execute(&self, input: &Box<dyn Status>) -> Box<dyn Status> {
        let record_id = input
            .get_value("record_id")
            .map(value_as_i64)
            .unwrap_or(0);
        let submission_id = input.get_value("submission_id").map(value_as_string);

        let mut output = serde_json::json!({
            "record_id": record_id,
            "success": true,
        });
        if let Some(submission_id) = submission_id {
            if let Some(obj) = output.as_object_mut() {
                obj.insert("submission_id".to_string(), serde_json::Value::String(submission_id));
            }
        }
        Box::new(WorkflowStatus::completed(
            WorkflowValues::from_json_trusted(output, "submit_complete"),
            Some("Submit complete".to_string()),
        ))
    }
}

/// JudgeOption 适配器
///
/// 将现有的 JudgeService/CompileOption 系统转换为 Workflow 兼容的格式
pub struct JudgeOptionAdapter {
    platform: String,
}

impl JudgeOptionAdapter {
    pub fn new(platform: impl Into<String>) -> Self {
        Self {
            platform: platform.into(),
        }
    }

    /// 获取平台支持的语言列表
    pub fn get_languages(&self) -> Result<Vec<LanguageInfo>, String> {
        let judge_service = get_tool(&self.platform)
            .map_err(|e| format!("Platform {} not supported: {:?}", self.platform, e))?;

        let compile_option = judge_service.get_compile_option();
        let languages = compile_option.export_all_allowed_language();

        Ok(languages
            .into_iter()
            .map(|lang| LanguageInfo {
                name: lang.name,
                options: lang
                    .allow_option
                    .into_iter()
                    .map(|opt| OptionInfo {
                        name: opt.name,
                        is_compile: opt.is_compile,
                        is_input: opt.is_input,
                        allowed_values: opt.allowed_option,
                    })
                    .collect(),
            })
            .collect())
    }

    /// 将用户选择转换为 WorkflowValues（不可信，来自用户输入）
    pub fn to_status(
        &self,
        language: &str,
        options: HashMap<String, String>,
        code: &str,
    ) -> WorkflowValues {
        let option_list: Vec<String> = options
            .iter()
            .map(|(k, v)| format!("{}={}", k, v))
            .collect();

        WorkflowValues::from_json_untrusted(serde_json::json!({
            "platform": self.platform.clone(),
            "language": language,
            "code": code,
            "compile_options": option_list,
        }))
    }
}

fn parse_option_kv(item: &str, options: &mut HashMap<String, String>) {
    if let Some((k, v)) = item.split_once('=') {
        options.insert(k.trim().to_string(), v.trim().to_string());
    }
}

fn value_as_string(value: Box<dyn Value>) -> String {
    let raw = value.to_string();
    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&raw) {
        match parsed {
            serde_json::Value::String(s) => s,
            serde_json::Value::Number(n) => n.to_string(),
            serde_json::Value::Bool(b) => b.to_string(),
            other => ToString::to_string(&other),
        }
    } else {
        raw
    }
}

fn value_as_i64(value: Box<dyn Value>) -> i64 {
    let raw = value.to_string();
    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&raw) {
        if let Some(n) = parsed.as_i64() {
            return n;
        }
        if let Some(s) = parsed.as_str() {
            return s.parse::<i64>().unwrap_or(0);
        }
    }
    raw.parse::<i64>().unwrap_or(0)
}

/// 语言信息
#[derive(Debug, Clone)]
pub struct LanguageInfo {
    pub name: String,
    pub options: Vec<OptionInfo>,
}

/// 选项信息
#[derive(Debug, Clone)]
pub struct OptionInfo {
    pub name: String,
    pub is_compile: bool,
    pub is_input: bool,
    pub allowed_values: Vec<String>,
}