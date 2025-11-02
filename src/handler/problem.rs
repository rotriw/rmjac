use crate::handler::entry::{DefaultHandler, DefaultTools};
use actix_web::{delete, get, post, web, HttpResponse, Result as ActixResult, Scope, services, HttpRequest, HttpMessage};
use sea_orm::DatabaseConnection;
use serde::Deserialize;
use rmjac_core::{
    model::problem::{
        create_problem, get_problem, get_problem_model, modify_problem_statement,
        modify_problem_statement_source, refresh_problem_node_cache, CreateProblemProps,
        delete_problem_connections, remove_statement_from_problem, remove_tag_from_problem,
    },
    service::iden::get_node_ids_from_iden,
    graph::action::get_node_type,
};
use rmjac_core::auth::AuthContext;
use crate::utils::perm::UserAuthCotext;

use rmjac_core::utils::get_redis_connection;
use crate::handler::ResultHandler;
use macro_handler::BasicHandler;


#[derive(BasicHandler)]
pub struct View {
    tools: DefaultTools,
    user_context: Option<UserAuthCotext>,
    req: HttpRequest,
    problem_node_id: Option<i64>,
}

#[handler]
impl View {

    pub async fn before(self) -> ResultHandler<Self> {
        Ok(self)
    }

    pub async fn perm(self) -> ResultHandler<Self> {
        Ok(self)
    }

    #[path("/{iden}")]
    #[exec(before > perm)]
    pub async fn get(
        self,
        iden: String,
    ) -> ResultHandler<String> {

    }
}


pub fn service() -> Scope {
    web::scope("/api/problem")

}