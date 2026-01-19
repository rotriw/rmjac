//! Pages permission provider
use macro_perm::Perm;
use perm_tool::SaveService;
use strum_macros::{EnumCount, EnumIter};

/// 页面权限类型
#[derive(Perm, Clone, Copy, Debug, PartialEq, Eq, EnumCount, EnumIter)]
#[perm(edge_module = "perm_pages", edge_str = "perm_pages")]
#[repr(i64)]
pub enum Pages {
    All = -1,
    View = 1,
    Edit = 2,
    Delete = 4,
    Create = 8,
}