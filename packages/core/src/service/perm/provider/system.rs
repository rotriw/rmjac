//! System permission provider
use macro_perm::Perm;
use strum_macros::{EnumCount, EnumIter};

/// 系统权限类型
#[derive(Perm, Clone, Copy, Debug, PartialEq, Eq, EnumCount, EnumIter)]
#[perm(edge_module = "perm_system", edge_str = "perm_system")]
#[repr(i64)]
pub enum System {
    All = -1,
    CreateProblem = 1,
    ViewAdminDashboard = 2,
    ViewSite = 4,
    Register = 8,
    ProblemManage = 16,
    CreateTraining = 32,
    ManageAllTraining = 64,
    CreateRecord = 128,
    ManageVjudge = 256,
    ManageAllUser = 512,
    SendVjudgeProblemRequest = 1024,
}
