//! Manage permission provider
use macro_perm::Perm;
use perm_tool::SaveService;
use strum_macros::{EnumCount, EnumIter};

/// 管理权限类型
#[derive(Perm, Clone, Copy, Debug, PartialEq, Eq, EnumCount, EnumIter)]
#[perm(edge_module = "perm_manage", edge_str = "perm_manage")]
#[repr(i64)]
pub enum Manage {
    All = -1,
    View = 1,
    Edit = 2,
    Delete = 4,
    Grant = 8,
    Revoke = 16,
}
