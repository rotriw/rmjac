//! View permission provider
use macro_perm::Perm;
use strum_macros::{EnumCount, EnumIter};

/// 查看权限类型
#[derive(Perm, Clone, Copy, Debug, PartialEq, Eq, EnumCount, EnumIter)]
#[perm(edge_module = "perm_view", edge_str = "perm_view")]
#[repr(i64)]
pub enum View {
    All = -1,
    View = 1,
    Edit = 2,
    Delete = 4,
}
