use enum_const::EnumConst;
use sea_orm::{ColumnTrait, QuerySelect};
use actix_web::{post, web, Scope, HttpMessage, HttpRequest};
use tap::Conv;
use rmjac_core::model::problem::{CreateProblemProps, ProblemListQuery, ProblemStatementProp, ProblemFactory, ProblemRepository, ProblemPermissionService, ProblemStatement};
use rmjac_core::model::perm::{check_problem_perm, check_system_perm};
use rmjac_core::model::record::RecordRepository;
use rmjac_core::graph::edge::{EdgeQuery, problem_statement::ProblemStatementEdgeQuery};
use rmjac_core::graph::edge::perm_problem::{PermProblemEdgeQuery, ProblemPerm, ProblemPermRaw};
use rmjac_core::graph::edge::perm_problem::ProblemPerm::ReadProblem;
use rmjac_core::db::entity::edge::record::Column as RecordEdgeColumn;
use rmjac_core::db::entity::node::problem_statement::ContentType;
use rmjac_core::graph::edge::perm_system::SystemPerm;
use rmjac_core::graph::node::record::RecordStatus;
use rmjac_core::utils::get_redis_connection;
use crate::handler::{BasicHandler, HttpError, ResultHandler};
use crate::handler::HandlerError::PermissionDenied;
use crate::utils::perm::UserAuthCotext;
use macro_handler::{generate_handler, handler, from_path, export, perm, route};

// View Handler - 查看题目
#[generate_handler]
mod view {
    use super::*;

    #[handler("/view")]
    pub struct View {
        basic: BasicHandler,
    }

    impl View {
        #[from_path(iden)]
        #[export(problem_node_id, statement_node_id)]
        async fn before_resolve(&self, iden: &str) -> ResultHandler<(i64, i64)> {
            let mut redis = get_redis_connection();
            let data = {
                let mut store = (&self.basic.db, &mut redis);
                ProblemRepository::resolve(&mut store, iden).await?
            };
            Ok((data.0, data.1))
        }

        #[perm]
        async fn check_view_perm(&self, problem_node_id: &i64) -> bool {
            let user_node_id = if let Some(uc) = &self.basic.user_context && uc.is_real {
                uc.user_id
            } else {
                rmjac_core::env::DEFAULT_NODES.lock().unwrap().guest_user_node
            };
            let check = check_problem_perm(
                user_node_id,
                *problem_node_id,
                ProblemPermRaw::Perms(vec![ReadProblem]).conv::<i32>() as i64
            );
            check != 0
        }

        #[handler]
        #[route("/{iden}")]
        async fn get_view(&self, problem_node_id: i64, statement_node_id: i64) -> ResultHandler<String> {
            let mut redis = get_redis_connection();
            let model = {
                let mut store = (&self.basic.db, &mut redis);
                ProblemRepository::model(&mut store, problem_node_id).await?
            };
            let get_user_submit_data = if let Some(uc) = &self.basic.user_context && uc.is_real {
                let data = RecordRepository::by_user_statement(&self.basic.db, uc.user_id, statement_node_id, 100, 1).await;
                data.ok()
            } else {
                None
            };
            let get_user_accepted_data = if let Some(uc) = &self.basic.user_context && uc.is_real {
                Some(RecordRepository::by_node(&self.basic.db, uc.user_id, 1, 1, vec![
                    RecordEdgeColumn::RecordStatus.eq(RecordStatus::Accepted.get_const_isize().unwrap_or(100) as i32)
                ]).await?)
            } else {
                None
            };
            Ok(Json! {
                "model": model,
                "statement": statement_node_id,
                "user_recent_records": get_user_submit_data,
                "user_last_accepted_record": get_user_accepted_data
            })
        }

        #[handler]
        #[route("/{iden}")]
        async fn post_view(&self, problem_node_id: i64, statement_node_id: i64) -> ResultHandler<String> {
            // Same as get_view
            let mut redis = get_redis_connection();
            let model = {
                let mut store = (&self.basic.db, &mut redis);
                ProblemRepository::model(&mut store, problem_node_id).await?
            };
            let get_user_submit_data = if let Some(uc) = &self.basic.user_context && uc.is_real {
                let data = RecordRepository::by_user_statement(&self.basic.db, uc.user_id, statement_node_id, 100, 1).await;
                data.ok()
            } else {
                None
            };
            let get_user_accepted_data = if let Some(uc) = &self.basic.user_context && uc.is_real {
                Some(RecordRepository::by_node(&self.basic.db, uc.user_id, 1, 1, vec![
                    RecordEdgeColumn::RecordStatus.eq(RecordStatus::Accepted.get_const_isize().unwrap_or(100) as i32)
                ]).await?)
            } else {
                None
            };
            Ok(Json! {
                "model": model,
                "statement": statement_node_id,
                "user_recent_records": get_user_submit_data,
                "user_last_accepted_record": get_user_accepted_data
            })
        }
    }
}

// Create Handler - 创建题目
#[generate_handler]
mod create {
    use super::*;

    #[handler("/create")]
    pub struct Create {
        basic: BasicHandler,
    }

    impl Create {
        #[perm]
        async fn check_create_perm(&self) -> bool {
            let user = &self.basic.user_context;
            let system_id = rmjac_core::env::DEFAULT_NODES.lock().unwrap().default_system_node;
            if let Some(user) = user
                && user.is_real
                && check_system_perm(user.user_id, system_id, SystemPerm::CreateProblem.get_const_isize().unwrap() as i64) == 1 {
                true
            } else {
                false
            }
        }

        #[handler]
        #[route("/create")]
        async fn post_create(&self, data: CreateProblemProps) -> ResultHandler<String> {
            let mut redis = get_redis_connection();
            let result = {
                let mut store = (&self.basic.db, &mut redis);
                ProblemFactory::create_with_user(&mut store, &data, true).await?
            };
            Ok(Json! {
                "data": result,
            })
        }
    }
}

// List Handler - 题目列表
#[generate_handler]
mod list {
    use super::*;

    #[handler("/list")]
    pub struct List {
        basic: BasicHandler,
    }

    impl List {
        #[handler]
        #[route("/list")]
        async fn get_list(&self, query: ProblemListQuery) -> ResultHandler<String> {
            let page = query.page.unwrap_or(1);
            let per_page = query.per_page.unwrap_or(20);
            let mut redis = get_redis_connection();

            use rmjac_core::db::entity::node::problem::Column;
            use sea_orm::{EntityTrait, QueryFilter, QueryOrder, PaginatorTrait};
            use rmjac_core::db::entity::node::problem::Entity;

            let mut db_query = Entity::find();

            if let Some(name) = query.name {
                db_query = db_query.filter(Column::Name.contains(&name));
            }

            if let Some(author_search) = query.author {
                use rmjac_core::graph::edge::misc::MiscEdgeQuery;
                use rmjac_core::db::entity::edge::misc::Column as MiscColumn;
                
                let user_node_id = if let Ok(user) = rmjac_core::db::entity::node::user::get_user_by_iden(&self.basic.db, &author_search).await {
                    Some(user.node_id)
                } else {
                    author_search.parse::<i64>().ok()
                };

                if let Some(uid) = user_node_id {
                    let problem_ids = MiscEdgeQuery::get_v_filter(uid, MiscColumn::MiscType.eq("author"), &self.basic.db).await.unwrap_or_default();
                    db_query = db_query.filter(Column::NodeId.is_in(problem_ids));
                }
            }

            if let Some(tags) = query.tag {
                for tag_name in tags {
                    use rmjac_core::db::entity::node::problem_tag::Column as TagColumn;
                    use rmjac_core::db::entity::node::problem_tag::Entity as TagEntity;
                    use rmjac_core::graph::edge::problem_tag::ProblemTagEdgeQuery;

                    if let Ok(Some(tag_node)) = TagEntity::find().filter(TagColumn::TagName.eq(tag_name)).one(&self.basic.db).await {
                        let problem_ids = ProblemTagEdgeQuery::get_u(tag_node.node_id, &self.basic.db).await.unwrap_or_default();
                        db_query = db_query.filter(Column::NodeId.is_in(problem_ids));
                    }
                }
            }

            let total = db_query.clone().count(&self.basic.db).await
                .map_err(|e| HttpError::CoreError(e.into()))?;

            let problems: Vec<rmjac_core::db::entity::node::problem::Model> = db_query
                .order_by_desc(Column::NodeId)
                .offset((page - 1) * per_page)
                .limit(per_page)
                .all(&self.basic.db)
                .await
                .map_err(|e| HttpError::CoreError(e.into()))?;

            let mut result_list = vec![];
            for p in problems {
                let model = {
                    let mut store = (&self.basic.db, &mut redis);
                    ProblemRepository::model(&mut store, p.node_id).await?
                };
                let idens = rmjac_core::service::iden::get_node_id_iden(&self.basic.db, &mut redis, p.node_id).await.unwrap_or_default();
                let iden = idens.first().cloned().unwrap_or_else(|| "unknown".to_string());

                result_list.push(serde_json::json!({
                    "model": model,
                    "iden": iden,
                }));
            }

            Ok(Json! {
                "problems": result_list,
                "page": page,
                "per_page": per_page,
                "total": total
            })
        }
    }
}

// Manage Handler - 管理题目（需要更复杂的权限检查）
#[generate_handler]
mod manage {
    use super::*;

    #[handler("/manage")]
    pub struct Manage {
        basic: BasicHandler,
    }

    impl Manage {
        #[from_path(iden)]
        #[export(problem_node_id, _statement_node_id)]
        async fn before_resolve(&self, iden: &str) -> ResultHandler<(i64, i64)> {
            let mut redis = get_redis_connection();
            let data = {
                let mut store = (&self.basic.db, &mut redis);
                ProblemRepository::resolve(&mut store, iden).await?
            };
            Ok((data.0, data.1))
        }

        /// 检查编辑权限（非 sudo）
        fn check_edit_perm_sync(&self, problem_node_id: i64) -> bool {
            let user = &self.basic.user_context;
            if let Some(user) = user && user.is_real {
                let user_id = user.user_id;
                if check_problem_perm(user_id, problem_node_id, ProblemPerm::EditProblem.get_const_isize().unwrap() as i64) == 1 {
                    return true;
                }
                let system_id = rmjac_core::env::DEFAULT_NODES.lock().unwrap().default_system_node;
                if check_system_perm(user_id, system_id, SystemPerm::ProblemManage.get_const_isize().unwrap() as i64) == 1 {
                    return true;
                }
            }
            false
        }

        /// 检查所有者权限（sudo）
        fn check_owner_perm_sync(&self, problem_node_id: i64) -> bool {
            let user = &self.basic.user_context;
            if let Some(user) = user && user.is_real {
                let user_id = user.user_id;
                if check_problem_perm(user_id, problem_node_id, ProblemPerm::OwnProblem.get_const_isize().unwrap() as i64) == 1 {
                    return true;
                }
                let system_id = rmjac_core::env::DEFAULT_NODES.lock().unwrap().default_system_node;
                if check_system_perm(user_id, system_id, SystemPerm::ProblemManage.get_const_isize().unwrap() as i64) == 1 {
                    return true;
                }
            }
            false
        }

        #[handler]
        #[route("/manage/{iden}/delete")]
        async fn post_delete(&self, problem_node_id: i64, statement_node_id: i64) -> ResultHandler<String> {
            // 需要 sudo 权限
            if !self.check_owner_perm_sync(problem_node_id) {
                return Err(HttpError::HandlerError(PermissionDenied));
            }
            
            let mut redis = get_redis_connection();
            if statement_node_id != -1 {
                ProblemStatementEdgeQuery::delete(&self.basic.db, problem_node_id, statement_node_id).await?;
            } else {
                let mut store = (&self.basic.db, &mut redis);
                ProblemRepository::purge(&mut store, problem_node_id).await?;
            }
            Ok(Json! {
                "message": format!("delete problem {}", problem_node_id),
            })
        }

        #[handler]
        #[route("/manage/{iden}/add_statement")]
        async fn post_add_statement(&self, problem_node_id: i64, body: ProblemStatementProp) -> ResultHandler<String> {
            if !self.check_edit_perm_sync(problem_node_id) {
                return Err(HttpError::HandlerError(PermissionDenied));
            }
            
            let mut redis = get_redis_connection();
            let result = {
                let mut store = (&self.basic.db, &mut redis);
                ProblemFactory::add_statement(&mut store, problem_node_id, ProblemFactory::generate_statement_schema(body)).await?
            };
            Ok(Json! {
                "message": "success",
                "result": result,
            })
        }

        #[handler]
        #[route("/manage/{iden}/update_statement_content")]
        async fn post_update_statement_content(&self, problem_node_id: i64, statement_node_id: i64, body: Vec<ContentType>) -> ResultHandler<String> {
            if !self.check_edit_perm_sync(problem_node_id) {
                return Err(HttpError::HandlerError(PermissionDenied));
            }
            
            let mut redis = get_redis_connection();
            let result = {
                let mut store = (&self.basic.db, &mut redis);
                let stmt = ProblemStatement::new(statement_node_id);
                stmt.set_content(&mut store, body).await?
            };
            Ok(Json! {
                "message": "success",
                "result": result,
            })
        }

        #[handler]
        #[route("/manage/{iden}/update_statement_source")]
        async fn post_update_statement_source(&self, problem_node_id: i64, statement_node_id: i64, new_source: String) -> ResultHandler<String> {
            if !self.check_edit_perm_sync(problem_node_id) {
                return Err(HttpError::HandlerError(PermissionDenied));
            }
            
            let mut redis = get_redis_connection();
            let result = {
                let mut store = (&self.basic.db, &mut redis);
                let stmt = ProblemStatement::new(statement_node_id);
                stmt.set_source(&mut store, &new_source).await?
            };
            Ok(Json! {
                "message": "success",
                "result": result,
            })
        }

        #[handler]
        #[route("/manage/{iden}/add_iden")]
        async fn post_add_iden(&self, problem_node_id: i64, _new_iden: String) -> ResultHandler<String> {
            if !self.check_owner_perm_sync(problem_node_id) {
                return Err(HttpError::HandlerError(PermissionDenied));
            }
            // TODO.
            Ok(Json! {
                "message": "work in progress.",
            })
        }

        #[handler]
        #[route("/manage/{iden}/perm/add_editor")]
        async fn post_add_editor(&self, problem_node_id: i64, user_id: i64) -> ResultHandler<String> {
            if !self.check_owner_perm_sync(problem_node_id) {
                return Err(HttpError::HandlerError(PermissionDenied));
            }
            
            let mut redis = get_redis_connection();
            let store = (&self.basic.db, &mut redis);
            ProblemPermissionService::add_editor(&store, user_id, problem_node_id).await?;
            Ok(Json! {
                "message": "successful",
            })
        }

        #[handler]
        #[route("/manage/{iden}/perm/remove_editor")]
        async fn post_remove_editor(&self, problem_node_id: i64, manager: i64) -> ResultHandler<String> {
            if !self.check_owner_perm_sync(problem_node_id) {
                return Err(HttpError::HandlerError(PermissionDenied));
            }
            
            let mut redis = get_redis_connection();
            let store = (&self.basic.db, &mut redis);
            ProblemPermissionService::remove_editor(&store, manager, problem_node_id).await?;
            Ok(Json! {
                "message": "successful",
            })
        }

        #[handler]
        #[route("/manage/{iden}/perm/view_editor")]
        async fn post_view_editor(&self, problem_node_id: i64) -> ResultHandler<String> {
            if !self.check_edit_perm_sync(problem_node_id) {
                return Err(HttpError::HandlerError(PermissionDenied));
            }
            Ok(Json! {
                "message": "work in progress.",
            })
        }

        #[handler]
        #[route("/manage/{iden}/perm/add_visitor")]
        async fn post_add_visitor(&self, problem_node_id: i64, user_id: i64) -> ResultHandler<String> {
            if !self.check_edit_perm_sync(problem_node_id) {
                return Err(HttpError::HandlerError(PermissionDenied));
            }
            
            let mut redis = get_redis_connection();
            let store = (&self.basic.db, &mut redis);
            ProblemPermissionService::add_viewer(&store, user_id, problem_node_id).await?;
            Ok(Json! {
                "message": "successful",
            })
        }

        #[handler]
        #[route("/manage/{iden}/perm/remove_visitor")]
        async fn post_remove_visitor(&self, problem_node_id: i64, user_id: i64) -> ResultHandler<String> {
            if !self.check_edit_perm_sync(problem_node_id) {
                return Err(HttpError::HandlerError(PermissionDenied));
            }
            
            let mut redis = get_redis_connection();
            let store = (&self.basic.db, &mut redis);
            ProblemPermissionService::remove_viewer(&store, user_id, problem_node_id).await?;
            Ok(Json! {
                "message": "successful",
            })
        }

        #[handler]
        #[route("/manage/{iden}/perm/view_visitor")]
        async fn post_view_visitor(&self, problem_node_id: i64) -> ResultHandler<String> {
            if !self.check_edit_perm_sync(problem_node_id) {
                return Err(HttpError::HandlerError(PermissionDenied));
            }
            Ok(Json! {
                "message": "work in progress.",
            })
        }

        #[handler]
        #[route("/manage/{iden}/transfer_owner")]
        async fn post_transfer_owner(&self, problem_node_id: i64, new_owner: i64) -> ResultHandler<String> {
            if !self.check_owner_perm_sync(problem_node_id) {
                return Err(HttpError::HandlerError(PermissionDenied));
            }
            
            use rmjac_core::db::entity::edge::perm_problem::Column;
            let old_owner_id = self.basic.user_context.as_ref().unwrap().user_id;
            let old_owners = PermProblemEdgeQuery::get_u_filter(problem_node_id, Column::UNodeId.eq(old_owner_id), &self.basic.db).await?;
            if old_owners.contains(&old_owner_id) {
                let mut redis = get_redis_connection();
                let store = (&self.basic.db, &mut redis);
                ProblemPermissionService::remove_owner(&store, old_owner_id, problem_node_id).await?;
            }
            let mut redis = get_redis_connection();
            let store = (&self.basic.db, &mut redis);
            ProblemPermissionService::add_owner(&store, new_owner, problem_node_id).await?;
            Ok(Json! {
                "message": "successful",
            })
        }
    }
}

// Test Handler
#[post("/test/add_task")]
pub async fn test_add_task(_req: HttpRequest, task: web::Json<serde_json::Value>) -> ResultHandler<String> {
    use rmjac_core::service::socket::service::add_task;
    let success = add_task(&task.into_inner()).await;
    Ok(Json! {
        "success": success,
    })
}

pub fn service() -> Scope {
    web::scope("/api/problem")
        .service(view::View::export_http_service())
        .service(create::Create::export_http_service())
        .service(list::List::export_http_service())
        .service(manage::Manage::export_http_service())
        .service(test_add_task)
}
