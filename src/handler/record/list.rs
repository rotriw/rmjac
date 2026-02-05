use crate::handler::{HttpError, ResultHandler};
use crate::utils::perm::UserAuthCotext;
use macro_handler::{export, generate_handler, handler, route};
use rmjac_core::graph::edge::EdgeQuery;
use rmjac_core::graph::edge::problem_statement::ProblemStatementEdgeQuery;
use rmjac_core::graph::edge::record::RecordEdge;
use rmjac_core::graph::node::Node;
use rmjac_core::graph::node::problem::ProblemNode;
use rmjac_core::graph::node::user::UserNode;
use rmjac_core::model::ModelStore;
use rmjac_core::model::problem::ProblemImport;
use sea_orm::{ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter, QueryOrder, QuerySelect};
use serde::Serialize;


#[generate_handler(route = "/list", real_path = "/api/record/list")]
pub mod handler {
    use rmjac_core::graph::edge::record::RecordListItem;
    use rmjac_core::model::record::{RecordListQuery, RecordSearch};

    use super::*;

    #[handler]
    #[route("/")]
    #[export("records", "page", "per_page", "total")]
    async fn get_list(
        store: &mut impl ModelStore,
        page: Option<u64>,
        per_page: Option<u64>,
        user: Option<String>,
        problem: Option<String>,
        status: Option<i64>,
        platform: Option<String>,
    ) -> ResultHandler<(Vec<RecordListItem>, u64, u64, u64)> {
        let query = RecordListQuery {
            page,
            per_page,
            user,
            problem,
            status,
            platform,
        };

        let query_found = RecordSearch::combine(store, &query).await?;
        let expand = RecordSearch::to_list_items(store, query_found).await?;
        
        let page = query.page.unwrap_or(1);
        let per_page = query.per_page.unwrap_or(20);
        let total = expand.len() as u64;

        Ok((expand, page, per_page, total))
    }
}

