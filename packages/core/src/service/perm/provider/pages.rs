//! Pages permission provider
//!
//! 使用 PermProvider derive 宏自动实现权限服务函数

use macro_perm::PermProvider;
use strum_macros::{EnumCount, EnumIter};

/// 页面权限类型
#[derive(Clone, Copy, Debug, PartialEq, Eq, EnumCount, EnumIter, PermProvider)]
#[perm_provider(edge_module = "perm_pages", edge_type = "PermPagesEdge", edge_raw_type = "PermPagesEdgeRaw")]
#[repr(i64)]
pub enum Pages {
    All = -1,
    View = 1,
    Edit = 2,
    Delete = 4,
    Create = 8,
}

impl From<Pages> for i64 {
    fn from(val: Pages) -> Self {
        val as i64
    }
}