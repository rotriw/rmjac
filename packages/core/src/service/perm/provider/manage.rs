//! Manage permission provider
//!
//! 使用 PermProvider derive 宏自动实现权限服务函数

use macro_perm::PermProvider;
use strum_macros::{EnumCount, EnumIter};

/// 管理权限类型
#[derive(Clone, Copy, Debug, PartialEq, Eq, EnumCount, EnumIter, PermProvider)]
#[perm_provider(edge_module = "perm_manage", edge_type = "PermManageEdge", edge_raw_type = "PermManageEdgeRaw")]
#[repr(i64)]
pub enum Manage {
    All = -1,
    View = 1,
    Edit = 2,
    Delete = 4,
    Grant = 8,
    Revoke = 16,
}

impl From<Manage> for i64 {
    fn from(val: Manage) -> Self {
        val as i64
    }
}
