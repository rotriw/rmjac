use crate::handler::ResultHandler;
use crate::utils::perm::UserAuthCotext;
use chrono::NaiveDateTime;
use macro_handler::{export, generate_handler, handler, perm, require_login, route};
use rmjac_core::model::training::{Training, TrainingList};
use rmjac_core::model::ModelStore;
use serde::Serialize;

#[derive(Serialize)]
pub struct TrainingCreateResult {
    pub node_id: i64,
}

#[generate_handler(route = "/create", real_path = "/api/training/create")]
pub mod handler {
    use super::*;

    #[perm]
    #[require_login]
    async fn check_create_perm(_user_context: UserAuthCotext) -> bool {
        true
    }

    #[handler]
    #[perm(check_create_perm)]
    #[route("/normal")]
    #[export("data")]
    async fn post_create(
        store: &mut impl ModelStore,
        user_context: UserAuthCotext,
        iden: String,
        title: String,
        description_public: String,
        description_private: String,
        start_time: NaiveDateTime,
        end_time: NaiveDateTime,
        training_type: String,
        problem_list: TrainingList,
        write_perm_user: Vec<i64>,
        read_perm_user: Vec<i64>,
    ) -> ResultHandler<(serde_json::Value,)> {
        let user_id = user_context.user_id;
        let training_data = Training::create_as(
            store,
            &title,
            &user_id.to_string(),
            &iden,
            &description_public,
            &description_private,
            start_time,
            end_time,
            &training_type,
            &problem_list,
            write_perm_user,
            read_perm_user,
            user_id,
        )
        .await?;
        Ok((serde_json::to_value(training_data).unwrap_or_default(),))
    }
}