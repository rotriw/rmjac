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
use rmjac_core::model::problem::ProblemRepository;
use sea_orm::{ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter, QueryOrder, QuerySelect};
use serde::Serialize;


#[generate_handler(route = "/list", real_path = "/api/record/list")]
pub mod handler {
    use rmjac_core::graph::edge::record::RecordListItem;

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
        let page = page.unwrap_or(1);
        let per_page = per_page.unwrap_or(20);

        use rmjac_core::db::entity::edge::record::Column;
        use rmjac_core::db::entity::edge::record::Entity;

        let db = store.get_db().clone();
        let mut db_query = Entity::find();

        // Filter by user
        if let Some(ref user_search) = user {
            if let Ok(user_node) =
                rmjac_core::db::entity::node::user::get_user_by_iden(&db, user_search).await
            {
                db_query = db_query.filter(Column::UNodeId.eq(user_node.node_id));
            } else if let Ok(user_id) = user_search.parse::<i64>() {
                db_query = db_query.filter(Column::UNodeId.eq(user_id));
            }
        }

        // Filter by problem
        if let Some(ref problem_search) = problem {
            if let Ok((problem_node_id, _)) =
                ProblemRepository::resolve(store, problem_search).await
            {
                db_query = db_query.filter(Column::VNodeId.eq(problem_node_id));
            } else if let Ok(problem_id) = problem_search.parse::<i64>() {
                db_query = db_query.filter(Column::VNodeId.eq(problem_id));
            }
        }

        // Filter by status
        if let Some(status_val) = status {
            db_query = db_query.filter(Column::RecordStatus.eq(status_val));
        }

        // Filter by platform
        if let Some(ref platform_val) = platform {
            db_query = db_query.filter(Column::Platform.eq(platform_val.clone()));
        }

        // Get total count
        let total = db_query
            .clone()
            .count(&db)
            .await
            .map_err(|e| HttpError::CoreError(e.into()))?;

        // Get paginated results
        let edges: Vec<rmjac_core::db::entity::edge::record::Model> = db_query
            .order_by_desc(Column::RecordNodeId)
            .offset((page - 1) * per_page)
            .limit(per_page)
            .all(&db)
            .await
            .map_err(|e| HttpError::CoreError(e.into()))?;

        // Build result list
        let mut records = Vec::with_capacity(edges.len());
        for edge in edges {
            let record_edge: RecordEdge = edge.into();
            let problem_node_id = record_edge.v;
            let node_type = rmjac_core::graph::action::get_node_type(&db, problem_node_id)
                .await
                .unwrap_or_default();

            let (problem_name, problem_iden) = if node_type == "problem_statement" {
                let db_ref = store.get_db().clone();
                let idens = rmjac_core::service::iden::get_node_id_iden(
                    &db_ref,
                    store.get_redis(),
                    problem_node_id,
                )
                .await
                .unwrap_or_default();
                let iden = idens
                    .first()
                    .cloned()
                    .unwrap_or_else(|| "unknown".to_string());

                let problem_node_ids = ProblemStatementEdgeQuery::get_u(problem_node_id, &db)
                    .await
                    .unwrap_or_default();

                let name = if let Some(&p_id) = problem_node_ids.first() {
                    match ProblemNode::from_db(&db, p_id).await {
                        Ok(p) => p.public.name,
                        Err(_) => "Unknown Problem".to_string(),
                    }
                } else {
                    "Unknown Problem".to_string()
                };
                (name, iden)
            } else {
                let db_ref = store.get_db().clone();
                let idens = rmjac_core::service::iden::get_node_id_iden(
                    &db_ref,
                    store.get_redis(),
                    problem_node_id,
                )
                .await
                .unwrap_or_default();
                let iden = idens
                    .first()
                    .cloned()
                    .unwrap_or_else(|| "unknown".to_string());

                match ProblemNode::from_db(&db, problem_node_id).await {
                    Ok(p) => (p.public.name, iden),
                    Err(_) => ("Unknown Problem".to_string(), iden),
                }
            };

            let (user_name, user_iden) = match UserNode::from_db(&db, record_edge.u).await {
                Ok(u) => (u.public.name, u.public.iden),
                Err(_) => ("Unknown User".to_string(), "unknown".to_string()),
            };

            records.push(RecordListItem {
                edge: record_edge,
                problem_name,
                problem_iden,
                user_name,
                user_iden,
            });
        }

        Ok((records, page, per_page, total))
    }
}
