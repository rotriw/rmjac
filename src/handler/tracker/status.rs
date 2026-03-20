use crate::handler::ResultHandler;
use crate::utils::perm::UserAuthCotext;
use macro_handler::{export, generate_handler, handler, perm, require_login, route};

#[generate_handler(route = "/status", real_path = "/api/tracker/status")]
pub mod handler {
    use rmjac_core::service::record::query::query_batch_user_problem_status;
    use sea_orm::DatabaseConnection;
    use super::*;

    #[perm]
    #[require_login]
    async fn perm(user_context: UserAuthCotext) -> bool {
        true
    }

    #[handler]
    #[route("/get")]
    #[perm(perm)]
    #[export("status")]
    async fn post_tracker_status(
        db: &DatabaseConnection,
        problem_ids: Vec<i64>,
        user_ids: Vec<i64>,
    ) -> ResultHandler<Vec<(i64, i64, bool, f64)>> {
        Ok(query_batch_user_problem_status(db, &user_ids, &problem_ids).await?)
    }
}
