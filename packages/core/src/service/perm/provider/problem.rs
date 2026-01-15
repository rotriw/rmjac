//! Problem permission provider
//!
//! 使用 PermProvider derive 宏自动实现权限服务函数

use macro_perm::PermProvider;
use strum_macros::{EnumCount, EnumIter};

/// 题目权限类型
#[derive(Clone, Copy, Debug, PartialEq, Eq, EnumCount, EnumIter, PermProvider)]
#[perm_provider(edge_module = "perm_problem", edge_type = "PermProblemEdge", edge_raw_type = "PermProblemEdgeRaw")]
#[repr(i64)]
pub enum Problem {
    All = -1,
    View = 1,
    Submit = 2,
    Edit = 4,
    Delete = 8,
    ManageTestcase = 16,
    ViewTestcase = 32,
}

impl From<Problem> for i64 {
    fn from(val: Problem) -> Self {
        val as i64
    }
}
