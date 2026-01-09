use crate::handler::ResultHandler;
use crate::utils::perm::UserAuthCotext;
use enum_const::EnumConst;
use macro_handler::{export, generate_handler, handler, perm, require_login, route};
use rmjac_core::graph::edge::perm_system::SystemPerm;
use rmjac_core::graph::node::problem::ProblemNode;
use rmjac_core::model::perm::check_system_perm;
use rmjac_core::model::problem::{CreateProblemProps, ProblemFactory, ProblemStatementProp};
use rmjac_core::model::ModelStore;

#[generate_handler(route = "/create", real_path = "/api/problem/create")]
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
        check_system_perm(
            user_id,
            system_id,
            SystemPerm::CreateProblem.get_const_isize().unwrap() as i64,
        ) == 1
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