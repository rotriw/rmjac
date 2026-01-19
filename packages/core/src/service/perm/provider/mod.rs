pub mod manage;
pub mod pages;
pub mod problem;
pub mod system;
pub mod view;

pub use manage::Manage;
pub use manage::ManagePermService;
pub use pages::Pages;
pub use pages::PagesPermService;
pub use problem::Problem;
pub use problem::ProblemPermService;
pub use system::System;
pub use system::SystemPermService;
pub use view::View;
pub use view::ViewPermService;

pub async fn init_all_perms(db: &sea_orm::DatabaseConnection) {
    ManagePermService::init(db).await;
    ProblemPermService::init(db).await;
    ViewPermService::init(db).await;
    PagesPermService::init(db).await;
    SystemPermService::init(db).await;
}
