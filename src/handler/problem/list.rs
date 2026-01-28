use crate::handler::{HttpError, ResultHandler};
use crate::utils::perm::UserAuthCotext;
use macro_handler::{export, generate_handler, handler, route};
use rmjac_core::graph::edge::EdgeQuery;
use rmjac_core::model::ModelStore;
use rmjac_core::model::problem::{ProblemModel, ProblemRepository};
use sea_orm::{ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter, QueryOrder, QuerySelect};
use serde::Serialize;


#[generate_handler(route = "/search", real_path = "/api/problem/search")]
pub mod handler {
    use rmjac_core::model::problem::{ProblemListItem, ProblemListQuery, ProblemSearch};

    use super::*;

    #[handler]
    #[route("/")]
    #[export("problems")]
    async fn post_search(
        store: &mut impl ModelStore,
        query: ProblemListQuery,
    ) -> ResultHandler<Vec<ProblemListItem>> {
        let query_found = ProblemSearch::combine(store, &query).await?;
        let mut expand = vec![];
        for d in query_found {
            let v = ProblemRepository::model(store, d.node_id).await?;
            expand.push(ProblemListItem {
                model: v,
                iden: ProblemRepository::iden(store, d.node_id).await?
            });
        }
        Ok(expand)
    }
}
