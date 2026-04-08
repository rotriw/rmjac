use crate::handler::ResultHandler;
use crate::utils::perm::UserAuthCotext;
use macro_handler::{export, generate_handler, handler, perm, require_login, route};
use rmjac_core::service::perm::provider::{System, SystemPermService};

#[generate_handler(route = "/create", real_path = "/api/problem/create")]
pub mod handler {
    use rmjac_core::{action::problem::{CreateOption, create_problem}, error::CoreError, model::{event::{Event, EventParent, EventType}, problem::Problem, user::User}, service::{event::{create_event_iden, get_event_with_id}, save::{ManageService, Saved}}};
    use sea_orm::DatabaseConnection;
    use rmjac_core::service::search::AddToSearch;
    use super::*;

    #[perm]
    #[require_login]
    async fn check_create_perm(user_context: UserAuthCotext, with_event: Option<EventParent>) -> bool {
        let user_id = user_context.user_id;
        let system_id = rmjac_core::env::DEFAULT_NODES
            .lock()
            .unwrap()
            .default_system_node;
        if with_event.is_some() {
            return SystemPermService::verify(user_id, system_id, System::ManageEvent);
        }
        SystemPermService::verify(user_id, system_id, System::CreateProblem)
    }

    #[handler]
    #[route("/default")]
    #[perm(check_create_perm)]
    #[export("redirect")]
    async fn post_create(
        db: &DatabaseConnection,
        user_context: UserAuthCotext,
        problem: Problem,
        iden: Vec<String>,
        with_myself: bool,
        can_search: bool,
        with_event: Option<EventParent>,
    ) -> ResultHandler<String> {
        let count = with_myself as i8 + with_event.is_some() as i8;
        if count > 1 {
            Err(CoreError::Conflict("with_myself, with_event are mutually exclusive.".to_string()))?
        } else if count == 0 {
            Err(CoreError::NotFound("with_myself, with_event Require one option.".to_string()))?
        }
        let mut path = "".to_string();
        let event_parent = if with_myself {
            let user = Saved::<User>::get(user_context.user_id).await?;
            path += &user.data.name;
            EventParent::String(user.data.iden)
        } else {
            with_event.unwrap()
        };
        let owner_id = if with_myself {
            user_context.user_id
        } else {
            default_node!(default_system_node)
        };
        let problem = create_problem(db, owner_id, &problem, CreateOption {
            is_login: true,
            is_public: true,
        }).await?;
        path += &format!("/{}", iden[0].replace("/", "."));
        let event = create_event_iden(&problem, &iden, event_parent, db, &iden[0]).await?;
        if can_search {
            event.set_can_search(&db);
        }
        Ok(format!("/problem/{path}"))
    }
}
