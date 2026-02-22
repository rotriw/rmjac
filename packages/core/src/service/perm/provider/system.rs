//! Manage permission provider
use macro_perm::Perm;
use strum_macros::{EnumCount, EnumIter};

/// 管理权限类型
#[derive(Perm, Clone, Copy, Debug, PartialEq, Eq, EnumCount, EnumIter)]
#[perm(edge_module = "perm_system", edge_str = "perm_system")]
#[repr(i64)]
pub enum System {
    All = -1,
    ViewAllPage = 1,
    CreateProblem = 2,
    ManageEvent = 4,
    ManageInit = 8,
}
