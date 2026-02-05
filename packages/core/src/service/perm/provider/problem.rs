//! Problem permission provider
use macro_perm::Perm;
use strum_macros::{EnumCount, EnumIter};

/// 题目权限类型
#[derive(Perm, Clone, Copy, Debug, PartialEq, Eq, EnumCount, EnumIter)]
#[perm(edge_module = "perm_problem", edge_str = "perm_problem")]
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

impl ProblemPermService {
    pub async fn grant_creator(db: &sea_orm::DatabaseConnection, u: i64, v: i64) {
        Self::add(u, v, Problem::All, db).await;
    }
}
