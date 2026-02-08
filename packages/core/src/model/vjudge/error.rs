use crate::error::CoreError;
use crate::graph::node::user::remote_account::VjudgeNode;

/// VJudge 模块统一错误类型
#[derive(Debug)]
pub enum VjudgeError {
    /// 核心错误（来自CoreError）
    Core(CoreError),
    /// 账号验证失败
    VerificationFailed(String),
    /// 边缘服务不可用
    EdgeServerUnavailable(String),
    /// 用户与账号无关联
    UserNotRelated(String),
    /// 任务调度失败
    TaskDispatchFailed(String),
    /// 数据解析错误
    ParseError(String),
}

impl From<CoreError> for VjudgeError {
    fn from(err: CoreError) -> Self {
        VjudgeError::Core(err)
    }
}

impl From<VjudgeError> for CoreError {
    fn from(err: VjudgeError) -> Self {
        match err {
            VjudgeError::Core(e) => e,
            VjudgeError::VerificationFailed(msg) => CoreError::VjudgeError(msg),
            VjudgeError::EdgeServerUnavailable(msg) => CoreError::VjudgeError(msg),
            VjudgeError::UserNotRelated(msg) => CoreError::VjudgeError(msg),
            VjudgeError::TaskDispatchFailed(msg) => CoreError::VjudgeError(msg),
            VjudgeError::ParseError(msg) => CoreError::VjudgeError(msg),
        }
    }
}

/// 账号添加错误结果（兼容现有代码的AddErrorResult）
pub enum AddErrorResult {
    /// 核心错误
    CoreError(CoreError),
    /// 带警告的成功（如边缘服务离线但账号已创建）
    Warning(String, VjudgeNode),
}

impl From<CoreError> for AddErrorResult {
    fn from(err: CoreError) -> Self {
        AddErrorResult::CoreError(err)
    }
}

/// VJudge 模块 Result 类型别名
pub type VjudgeResult<T> = std::result::Result<T, VjudgeError>;
