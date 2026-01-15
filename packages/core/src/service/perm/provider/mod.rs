//! Permission Providers
//!
//! 每个 provider 模块定义了一种权限类型及其相关操作。
//! 使用 `PermProvider` derive 宏自动实现 init, add_perm, remove_perm, check 函数。

use std::future::Future;
use sea_orm::DatabaseConnection;

pub mod manage;
pub mod pages;
pub mod problem;
pub mod system;
pub mod view;

// Re-export permission enums for convenience
pub use manage::Manage;
pub use pages::Pages;
pub use problem::Problem;
pub use system::System;
pub use view::View;

// Re-export permission service structs
pub use manage::ManagePermService;
pub use pages::PagesPermService;
pub use problem::ProblemPermService;
pub use system::SystemPermService;
pub use view::ViewPermService;

/// Trait for permission edge providers
/// Each provider implements check, init, add_perm, and remove_perm operations
pub trait PermEdgeProvider {
    type PermType;
    fn check(&self, u: i64, v: i64, perm: Self::PermType) -> bool;
    fn init(&self, db: &DatabaseConnection) -> impl Future<Output = ()>;
    fn add_perm(&self, db: &DatabaseConnection, u: i64, v: i64, perm: Self::PermType) -> impl Future<Output = ()>;
    fn remove_perm(&self, db: &DatabaseConnection, u: i64, v: i64, perm: Self::PermType) -> impl Future<Output = ()>;
}

/// 初始化所有权限类型
/// 在应用启动时调用此函数从数据库加载权限到内存
pub async fn init_all_perms(db: &DatabaseConnection) {
    log::info!("Initializing all permission providers...");
    
    System::init(db).await;
    Problem::init(db).await;
    Pages::init(db).await;
    View::init(db).await;
    Manage::init(db).await;
    
    log::info!("All permission providers initialized.");
}
