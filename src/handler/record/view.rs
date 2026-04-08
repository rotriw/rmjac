use crate::handler::ResultHandler;
use crate::utils::perm::UserAuthCotext;
use macro_handler::{export, generate_handler, handler, perm, require_login, route};
use rmjac_core::service::perm::provider::System;

#[generate_handler(route = "/view", real_path = "/api/record/view")]
pub mod handler {
    use rmjac_core::{action::problem::{CreateOption, create_problem}, error::CoreError, model::{event::{Event, EventParent, EventType}, problem::Problem, record::{DetailSubtask, Record}, user::User}, service::{event::{create_event_iden, get_event_with_id}, judge::calc::CalcScore, perm::provider::Manage, record::subtask::GetSubtask, save::{ManageService, Saved}}};
    use sea_orm::DatabaseConnection;

    use super::*;

    #[perm]
    #[require_login]
    async fn perm(user_context: UserAuthCotext, id: i64) -> bool {
        let user_id = user_context.user_id;
        let system_id = rmjac_core::env::DEFAULT_NODES
            .lock()
            .unwrap()
            .default_system_node;
        Manage::verify(user_id, id, Manage::View)
        || System::verify(user_id, system_id, System::ViewAllPage)
        || System::verify(user_id, system_id, System::ViewAllRecord)
    }

    #[handler]
    #[route("/get")]
    #[perm(perm)]
    #[export("record")]
    async fn post_view(
        db: &DatabaseConnection,
        id: i64,
    ) -> ResultHandler<Saved<Record>> {
        Ok(Saved::get(id).await?)
    }

    #[handler]
    #[route("/record_with_detail")]
    #[perm(perm)]
    #[export("record", "detail")]
    async fn post_detail(
        db: &DatabaseConnection,
        id: i64,
    ) -> ResultHandler<(Saved<Record>, DetailSubtask)> {
        let record = Saved::<Record>::get(id).await?;
        let problem_id = record.data.basic.problem_id;
        let subtask = problem_id.get_related_subtask(db).await?;
        let detail = (&record, &subtask).calc_score(db).await?;
        Ok((record, detail))
    }
}
