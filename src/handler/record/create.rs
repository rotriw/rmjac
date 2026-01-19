use crate::handler::ResultHandler;
use crate::utils::perm::UserAuthCotext;
use macro_handler::{export, generate_handler, handler, perm, require_login, route};
use rmjac_core::graph::node::record::RecordNode;
use rmjac_core::model::problem::ProblemRepository;
use rmjac_core::model::record::{Record, RecordNewProp};
use rmjac_core::model::ModelStore;
use rmjac_core::service::perm::provider::{System, SystemPermService};

#[generate_handler(route = "/create", real_path = "/api/record/create")]
pub mod handler {
    use super::*;

    #[perm]
    #[require_login]
    async fn check_create_perm(user_context: UserAuthCotext) -> bool {
        let user_id = user_context.user_id;
        let system_id = rmjac_core::env::DEFAULT_NODES
            .lock()
            .unwrap()
            .default_system_node;
        SystemPermService.verify(user_id, system_id, System::CreateRecord)
    }

    #[handler]
    #[route("/{problem_iden}")]
    #[perm(check_create_perm)]
    #[export("message", "record")]
    async fn post_create(
        store: &mut impl ModelStore,
        user_context: UserAuthCotext,
        problem_iden: String,
        platform: String,
        code: String,
        code_language: String,
        url: String,
        public_status: bool,
    ) -> ResultHandler<(String, RecordNode)> {
        let (problem_node_id, statement_node_id) =
            ProblemRepository::resolve(store, &problem_iden).await?;

        let user_id = user_context.user_id;

        let record_props = RecordNewProp {
            platform,
            code,
            code_language,
            url,
            statement_node_id,
            public_status,
        };

        let record =
            Record::create_archived(store.get_db(), record_props, user_id, problem_node_id).await?;

        Ok(("Record created successfully".to_string(), record))
    }
}