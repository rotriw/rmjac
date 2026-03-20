use crate::handler::ResultHandler;
use crate::utils::perm::UserAuthCotext;
use macro_handler::{export, generate_handler, handler, perm, require_login, route};

#[generate_handler(route = "/create", real_path = "/api/record/create")]
pub mod handler {
    use rmjac_core::{action::remotejudge::update_user_record, model::{judge::JudgeResult, record::Record}, service::{event::get_event_with_id, perm::provider::{System, SystemPermService}, save::Saved}};
    use sea_orm::DatabaseConnection;

    use super::*;

    #[perm]
    #[require_login]
    async fn check_create_perm(user_context: UserAuthCotext) -> bool {
        let user_id = user_context.user_id;
        let system_id = rmjac_core::env::DEFAULT_NODES
            .lock()
            .unwrap()
            .default_system_node;
        SystemPermService::verify(user_id, system_id, System::CreateRecord)
    }

    #[export(problem_id)]
    async fn before_resolve_problem_iden(problem_iden: &str) -> ResultHandler<i64> {
        Ok(get_event_with_id(problem_iden).await?)
    }

    #[handler]
    #[route("/default")]
    #[perm(check_create_perm)]
    #[export("saved")]
    async fn post_create(
        db: &DatabaseConnection,
        user_context: UserAuthCotext,
        record: Record,
        problem_id: i64,
        detail: JudgeResult,
    ) -> ResultHandler<Saved<Record>> {
        Ok(update_user_record(record, user_context.user_id, detail, problem_id, db).await?)
    }

}
