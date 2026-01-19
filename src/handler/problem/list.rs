use crate::handler::{HttpError, ResultHandler};
use crate::utils::perm::UserAuthCotext;
use macro_handler::{export, generate_handler, handler, route};
use rmjac_core::graph::edge::EdgeQuery;
use rmjac_core::model::ModelStore;
use rmjac_core::model::problem::{ProblemModel, ProblemRepository};
use sea_orm::{ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter, QueryOrder, QuerySelect};
use serde::Serialize;


#[generate_handler(route = "/list", real_path = "/api/problem/list")]
pub mod handler {
    use rmjac_core::model::problem::ProblemListItem;

    use super::*;

    #[handler]
    #[route("/")]
    #[export("problems", "page", "per_page", "total")]
    async fn get_list(
        store: &mut impl ModelStore,
        page: Option<u64>,
        per_page: Option<u64>,
        name: Option<String>,
        tag: Option<Vec<String>>,
        author: Option<String>,
        _difficulty: Option<i32>,
    ) -> ResultHandler<(Vec<ProblemListItem>, u64, u64, u64)> {
        let page = page.unwrap_or(1);
        let per_page = per_page.unwrap_or(20);

        use rmjac_core::db::entity::node::problem::Column;
        use rmjac_core::db::entity::node::problem::Entity;

        let db = store.get_db().clone();
        let mut db_query = Entity::find();

        // Filter by name
        if let Some(ref name) = name {
            db_query = db_query.filter(Column::Name.contains(name));
        }

        // Filter by author
        if let Some(ref author_search) = author {
            use rmjac_core::db::entity::edge::misc::Column as MiscColumn;
            use rmjac_core::graph::edge::misc::MiscEdgeQuery;

            let user_node_id = if let Ok(user) =
                rmjac_core::db::entity::node::user::get_user_by_iden(&db, author_search).await
            {
                Some(user.node_id)
            } else {
                author_search.parse::<i64>().ok()
            };

            if let Some(uid) = user_node_id {
                let problem_ids: Vec<i64> =
                    MiscEdgeQuery::get_v_filter(uid, MiscColumn::MiscType.eq("author"), &db)
                        .await
                        .unwrap_or_default();
                db_query = db_query.filter(Column::NodeId.is_in(problem_ids));
            }
        }

        // Filter by tags
        if let Some(ref tags) = tag {
            for tag_name in tags {
                use rmjac_core::db::entity::node::problem_tag::Column as TagColumn;
                use rmjac_core::db::entity::node::problem_tag::Entity as TagEntity;
                use rmjac_core::graph::edge::problem_tag::ProblemTagEdgeQuery;

                if let Ok(Some(tag_node)) = TagEntity::find()
                    .filter(TagColumn::TagName.eq(tag_name))
                    .one(&db)
                    .await
                {
                    let problem_ids: Vec<i64> = ProblemTagEdgeQuery::get_u(tag_node.node_id, &db)
                        .await
                        .unwrap_or_default();
                    db_query = db_query.filter(Column::NodeId.is_in(problem_ids));
                }
            }
        }

        // Get total count
        let total = db_query
            .clone()
            .count(&db)
            .await
            .map_err(|e| HttpError::CoreError(e.into()))?;

        // Get paginated results
        let problems: Vec<rmjac_core::db::entity::node::problem::Model> = db_query
            .order_by_desc(Column::NodeId)
            .offset((page - 1) * per_page)
            .limit(per_page)
            .all(&db)
            .await
            .map_err(|e| HttpError::CoreError(e.into()))?;

        // Build result list with models and idens
        let mut result_list = Vec::with_capacity(problems.len());
        for p in problems {
            let model = ProblemRepository::model(store, p.node_id).await?;
            let db_ref = store.get_db().clone();
            let idens =
                rmjac_core::service::iden::get_node_id_iden(&db_ref, store.get_redis(), p.node_id)
                    .await
                    .unwrap_or_default();
            let iden = idens
                .first()
                .cloned()
                .unwrap_or_else(|| "unknown".to_string());

            result_list.push(ProblemListItem { model, iden });
        }

        Ok((result_list, page, per_page, total))
    }

    #[handler]
    #[route("/")]
    #[export("problems", "page", "per_page", "total")]
    async fn post_list(
        store: &mut impl ModelStore,
        page: Option<u64>,
        per_page: Option<u64>,
        name: Option<String>,
        tag: Option<Vec<String>>,
        author: Option<String>,
        _difficulty: Option<i32>,
    ) -> ResultHandler<(Vec<ProblemListItem>, u64, u64, u64)> {
        let page = page.unwrap_or(1);
        let per_page = per_page.unwrap_or(20);

        use rmjac_core::db::entity::node::problem::Column;
        use rmjac_core::db::entity::node::problem::Entity;

        let db = store.get_db().clone();
        let mut db_query = Entity::find();

        // Filter by name
        if let Some(ref name) = name {
            db_query = db_query.filter(Column::Name.contains(name));
        }

        // Filter by author
        if let Some(ref author_search) = author {
            use rmjac_core::db::entity::edge::misc::Column as MiscColumn;
            use rmjac_core::graph::edge::misc::MiscEdgeQuery;

            let user_node_id = if let Ok(user) =
                rmjac_core::db::entity::node::user::get_user_by_iden(&db, author_search).await
            {
                Some(user.node_id)
            } else {
                author_search.parse::<i64>().ok()
            };

            if let Some(uid) = user_node_id {
                let problem_ids: Vec<i64> =
                    MiscEdgeQuery::get_v_filter(uid, MiscColumn::MiscType.eq("author"), &db)
                        .await
                        .unwrap_or_default();
                db_query = db_query.filter(Column::NodeId.is_in(problem_ids));
            }
        }

        // Filter by tags
        if let Some(ref tags) = tag {
            for tag_name in tags {
                use rmjac_core::db::entity::node::problem_tag::Column as TagColumn;
                use rmjac_core::db::entity::node::problem_tag::Entity as TagEntity;
                use rmjac_core::graph::edge::problem_tag::ProblemTagEdgeQuery;

                if let Ok(Some(tag_node)) = TagEntity::find()
                    .filter(TagColumn::TagName.eq(tag_name))
                    .one(&db)
                    .await
                {
                    let problem_ids: Vec<i64> = ProblemTagEdgeQuery::get_u(tag_node.node_id, &db)
                        .await
                        .unwrap_or_default();
                    db_query = db_query.filter(Column::NodeId.is_in(problem_ids));
                }
            }
        }

        // Get total count
        let total = db_query
            .clone()
            .count(&db)
            .await
            .map_err(|e| HttpError::CoreError(e.into()))?;

        // Get paginated results
        let problems: Vec<rmjac_core::db::entity::node::problem::Model> = db_query
            .order_by_desc(Column::NodeId)
            .offset((page - 1) * per_page)
            .limit(per_page)
            .all(&db)
            .await
            .map_err(|e| HttpError::CoreError(e.into()))?;

        // Build result list with models and idens
        let mut result_list = Vec::with_capacity(problems.len());
        for p in problems {
            let model = ProblemRepository::model(store, p.node_id).await?;
            let db_ref = store.get_db().clone();
            let idens =
                rmjac_core::service::iden::get_node_id_iden(&db_ref, store.get_redis(), p.node_id)
                    .await
                    .unwrap_or_default();
            let iden = idens
                .first()
                .cloned()
                .unwrap_or_else(|| "unknown".to_string());

            result_list.push(ProblemListItem { model, iden });
        }

        Ok((result_list, page, per_page, total))
    }
}
