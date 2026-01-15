//! System permission provider
//!
//! 使用 PermProvider derive 宏自动实现权限服务函数

use macro_perm::PermProvider;
use strum_macros::{EnumCount, EnumIter};

/// 系统权限类型
#[derive(Clone, Copy, Debug, PartialEq, Eq, EnumCount, EnumIter, PermProvider)]
#[perm_provider(edge_module = "perm_system", edge_type = "PermSystemEdge", edge_raw_type = "PermSystemEdgeRaw")]
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
}

impl From<System> for i64 {
    fn from(val: System) -> Self {
        val as i64
    }
}