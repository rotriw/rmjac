//! Submit Service - 代码提交工作流服务
//!
//! 将代码提交到远程 OJ 平台，集成 JudgeService 配置

use std::collections::HashMap;
use async_trait::async_trait;
use workflow::workflow::{Service, ServiceInfo, Status, StatusDescribe, StatusRequire};

use crate::service::judge::service::get_tool;
use super::super::status::{
    VjudgeStatus, VjudgeStatusDescribe, VjudgeStatusRequire, VjudgeStatusType, VjudgeValue,
};

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
        let code = input
            .get_value("code")
            .ok_or("Missing required field: code")?
            .to_string();

        let language = input
            .get_value("language")
            .ok_or("Missing required field: language")?
            .to_string();

        let user_id: i64 = input
            .get_value("user_id")
            .map(|v| v.to_string().parse().unwrap_or(0))
            .unwrap_or(0);

        let record_id: i64 = input
            .get_value("record_id")
            .map(|v| v.to_string().parse().unwrap_or(0))
            .unwrap_or(0);

        // 获取 VJudge 账号信息
        let vjudge_account_id: i64 = input
            .get_value("vjudge_account_id")
            .map(|v| v.to_string().parse().unwrap_or(0))
            .unwrap_or(0);

        // 获取编译/路由选项
        let options = self.extract_options(input);

        // 获取平台特定选项（如 contest_id, problem_id）
        let contest_id = input.get_value("contest_id").map(|v| v.to_string());
        let problem_id = input.get_value("problem_id").map(|v| v.to_string());

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
            let opts_str = opts.to_string();
            // 解析 "[key=value, key=value]" 格式
            for item in opts_str.trim_matches(|c| c == '[' || c == ']').split(", ") {
                if let Some((k, v)) = item.split_once('=') {
                    options.insert(k.to_string(), v.to_string());
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
        serde_json::json!({
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
        })
        .to_string()
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
        // 使用 builder 模式
        Box::new(
            VjudgeStatusRequire::new()
                .with_required_key("code")
                .with_required_key("language")
                .with_required_key("vjudge_account_id"),
        )
    }

    fn get_export_describe(&self) -> Vec<Box<dyn StatusDescribe>> {
        vec![Box::new(
            VjudgeStatusDescribe::new(VjudgeStatusType::SubmissionCreated)
                .with_key("submission_id")
                .with_key("submission_url")
                .with_key("submit_time"),
        )]
    }

    async fn verify(&self, input: &Box<dyn Status>) -> bool {
        // 验证必要字段存在
        let has_code = input.get_value("code").is_some();
        let has_language = input.get_value("language").is_some();
        let has_account = input.get_value("vjudge_account_id").is_some();

        has_code && has_language && has_account
    }

    async fn execute(&self, input: &Box<dyn Status>) -> Box<dyn Status> {
        // 构建提交任务
        let task_data = match self.build_submit_task(input.as_ref()) {
            Ok(data) => data,
            Err(e) => {
                return Box::new(VjudgeStatus::new_error(&format!(
                    "Failed to build submit task: {}",
                    e
                )));
            }
        };

        // TODO: 实际通过 RemoteEdgeService 发送任务
        // 这里返回一个占位状态
        let mut status = VjudgeStatus::new_initial(&self.platform, "");
        status.status_type = VjudgeStatusType::SubmissionCreated;
        status.record_id = Some(task_data.record_id);
        status.extra.insert(
            "submission_id".to_string(),
            VjudgeValue::String("pending".to_string()),
        );

        Box::new(status)
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
        Box::new(
            VjudgeStatusRequire::new()
                .with_status_type(VjudgeStatusType::SubmissionCreated)
                .with_required_key("record_id"),
        )
    }

    fn get_export_describe(&self) -> Vec<Box<dyn StatusDescribe>> {
        vec![Box::new(
            VjudgeStatusDescribe::new(VjudgeStatusType::Completed)
                .with_key("record_id")
                .with_key("submission_id")
                .with_key("success"),
        )]
    }

    async fn verify(&self, input: &Box<dyn Status>) -> bool {
        input.get_status_type() == VjudgeStatusType::SubmissionCreated.as_str()
            && input.get_value("record_id").is_some()
    }

    async fn execute(&self, input: &Box<dyn Status>) -> Box<dyn Status> {
        let record_id = input
            .get_value("record_id")
            .and_then(|v| v.to_string().parse::<i64>().ok())
            .unwrap_or(0);
        let submission_id = input.get_value("submission_id").map(|v| v.to_string());

        let mut status = VjudgeStatus::new_completed(0);
        status = status.with_value("record_id", VjudgeValue::Number(record_id));
        if let Some(submission_id) = submission_id {
            status = status.with_value("submission_id", VjudgeValue::String(submission_id));
        }
        status = status.with_value("success", VjudgeValue::Bool(true));
        Box::new(status)
    }
}

/// 获取评测结果服务
///
/// 从远程平台获取提交的评测结果
#[derive(Clone)]
pub struct FetchResultService {
    platform: String,
}

impl FetchResultService {
    pub fn new(platform: impl Into<String>) -> Self {
        Self {
            platform: platform.into(),
        }
    }
}

#[async_trait(?Send)]
impl Service for FetchResultService {
    fn is_end(&self) -> bool {
        true // 获取结果后任务完成
    }

    fn get_info(&self) -> ServiceInfo {
        ServiceInfo {
            name: format!("fetch_result_{}", self.platform),
            description: format!("Fetch submission result from {}", self.platform),
            allow_description: "Requires submission_id from previous submit".to_string(),
        }
    }

    fn get_cost(&self) -> i32 {
        // 获取结果通常需要轮询，代价较高
        30
    }

    fn get_import_require(&self) -> Box<dyn StatusRequire> {
        Box::new(
            VjudgeStatusRequire::new()
                .with_required_key("submission_id")
                .with_required_key("platform"),
        )
    }

    fn get_export_describe(&self) -> Vec<Box<dyn StatusDescribe>> {
        vec![Box::new(
            VjudgeStatusDescribe::new(VjudgeStatusType::SubmissionJudged)
                .with_key("status")
                .with_key("score")
                .with_key("time")
                .with_key("memory")
                .with_key("message"),
        )]
    }

    async fn verify(&self, input: &Box<dyn Status>) -> bool {
        input.get_value("submission_id").is_some()
    }

    async fn execute(&self, _input: &Box<dyn Status>) -> Box<dyn Status> {
        // TODO: 实际通过 RemoteEdgeService 获取结果
        let mut status = VjudgeStatus::new_initial(&self.platform, "");
        status.status_type = VjudgeStatusType::SubmissionJudged;
        status.extra.insert(
            "status".to_string(),
            VjudgeValue::String("Pending".to_string()),
        );
        status
            .extra
            .insert("score".to_string(), VjudgeValue::Number(0));
        status
            .extra
            .insert("time".to_string(), VjudgeValue::Number(0));
        status
            .extra
            .insert("memory".to_string(), VjudgeValue::Number(0));

        Box::new(status)
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

    /// 将用户选择转换为 VjudgeStatus
    pub fn to_status(
        &self,
        language: &str,
        options: HashMap<String, String>,
        code: &str,
    ) -> VjudgeStatus {
        let mut status = VjudgeStatus::new_initial(&self.platform, "");

        // 添加额外数据
        status.extra.insert(
            "language".to_string(),
            VjudgeValue::String(language.to_string()),
        );
        status.extra.insert(
            "code".to_string(),
            VjudgeValue::String(code.to_string()),
        );

        // 转换选项为列表
        let option_list: Vec<VjudgeValue> = options
            .iter()
            .map(|(k, v)| VjudgeValue::String(format!("{}={}", k, v)))
            .collect();
        status
            .extra
            .insert("compile_options".to_string(), VjudgeValue::List(option_list));

        status
    }
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_submit_service_info() {
        let service = SubmitService::new("codeforces");
        let info = service.get_info();
        assert_eq!(info.name, "submit_codeforces");
        assert!(!service.is_end());
    }

    #[test]
    fn test_fetch_result_service_info() {
        let service = FetchResultService::new("atcoder");
        let info = service.get_info();
        assert_eq!(info.name, "fetch_result_atcoder");
        assert!(service.is_end());
    }

    #[test]
    fn test_submit_task_data_json() {
        let task = SubmitTaskData {
            platform: "codeforces".to_string(),
            operation: "submit".to_string(),
            code: "int main() {}".to_string(),
            language: "GNU G++20".to_string(),
            user_id: 1,
            record_id: 100,
            vjudge_account_id: 50,
            contest_id: Some("1234".to_string()),
            problem_id: Some("A".to_string()),
            options: HashMap::new(),
        };

        let json = task.to_json();
        assert!(json.contains("codeforces"));
        assert!(json.contains("submit"));
    }
}
