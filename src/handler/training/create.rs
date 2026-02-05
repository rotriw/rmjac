use crate::handler::ResultHandler;
use crate::utils::perm::UserAuthCotext;
use macro_handler::{export, generate_handler, handler, perm, route};
use rmjac_core::model::ModelStore;
use rmjac_core::model::training::Training;
use serde::Serialize;

#[derive(Serialize)]
pub struct TrainingCreateResult {
    pub node_id: i64,
}

#[generate_handler(route = "/create", real_path = "/api/training/create")]
pub mod handler {
    use rmjac_core::model::training::CreateTrainingReq;

    use super::*;

    #[perm]
    async fn check_create_perm(user_context: Option<UserAuthCotext>) -> bool {
        if let Some(uc) = user_context
            && uc.is_real
        {
            true
        } else {
            false
        }
    }

    #[handler]
    #[perm(check_create_perm)]
    #[route("/normal")]
    #[export("data")]
    async fn post_create(
        store: &mut impl ModelStore,
        user_context: Option<UserAuthCotext>,
        data: CreateTrainingReq,
    ) -> ResultHandler<(serde_json::Value,)> {
        let user_id = user_context.unwrap().user_id;
        let training_data = Training::create_as(
            store,
            &data.title,
            &data.iden,
            &data.description_public,
            &data.description_private,
            data.start_time,
            data.end_time,
            &data.training_type,
            &data.problem_list,
            data.write_perm_user,
            data.read_perm_user,
            user_id,
        )
        .await?;
        Ok((serde_json::to_value(training_data).unwrap_or_default(),))
    }
}
