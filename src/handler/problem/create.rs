use crate::handler::ResultHandler;
use crate::utils::perm::UserAuthCotext;
use macro_handler::{export, generate_handler, handler, perm, require_login, route};
use rmjac_core::graph::node::problem::ProblemNode;
use rmjac_core::model::problem::{CreateProblemProps, ProblemFactory, ProblemStatementProp};
use rmjac_core::model::ModelStore;
use rmjac_core::service::perm::provider::{System, SystemPermService};

#[generate_handler(route = "/create", real_path = "/api/problem/create")]
pub mod handler {
    use super::*;
    #[perm]
    #[require_login]
    async fn check_create_perm(user_context: UserAuthCotext) -> bool {
        SystemPermService::verify(user_context.user_id, default_node!(default_system_node), System::CreateProblem)
    }
    #[handler]
    #[route("/")]
    #[perm(check_create_perm)]
    #[export("problem")]
    async fn post_create(
        store: &mut impl ModelStore,
        user_context: UserAuthCotext,
        problem_iden: String,
        problem_name: String,
        problem_statement: Vec<ProblemStatementProp>,
        creation_time: Option<chrono::NaiveDateTime>,
        tags: Vec<String>,
    ) -> ResultHandler<(ProblemNode,)> {
        let props = CreateProblemProps {
            user_id: user_context.user_id,
            problem_iden,
            problem_name,
            problem_statement,
            creation_time,
            tags,
        };
        let result = ProblemFactory::create_with_user(store, &props, true).await?;
        Ok((result,))
    }
}