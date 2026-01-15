//! View permission provider
//!
//! 使用 PermProvider derive 宏自动实现权限服务函数

use macro_perm::PermProvider;
use strum_macros::{EnumCount, EnumIter};

/// 查看权限类型
#[derive(Clone, Copy, Debug, PartialEq, Eq, EnumCount, EnumIter, PermProvider)]
#[perm_provider(edge_module = "perm_view", edge_type = "PermViewEdge", edge_raw_type = "PermViewEdgeRaw")]
#[repr(i64)]
pub enum View {
    All = -1,
    View = 1,
    Edit = 2,
    Delete = 4,
}

impl From<View> for i64 {
    fn from(val: View) -> Self {
        val as i64
    }
}