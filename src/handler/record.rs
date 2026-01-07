use actix_web::{HttpMessage, HttpRequest, Scope, web};
use sea_orm::{DatabaseConnection, EntityTrait, QueryFilter, QueryOrder, QuerySelect};
use serde::Deserialize;
use rmjac_core::model::record::{RecordNewProp, Record, RecordRepository};
use rmjac_core::model::problem::ProblemRepository;
use rmjac_core::graph::node::record::{RecordStatus, RecordNode};
use rmjac_core::model::perm::check_system_perm;
use rmjac_core::graph::edge::perm_system::SystemPerm;
use rmjac_core::graph::node::Node;

use rmjac_core::error::QueryNotFound;
use rmjac_core::utils::get_redis_connection;
use crate::handler::{BasicHandler, HttpError, ResultHandler, HandlerError};
use crate::utils::perm::UserAuthCotext;
use enum_const::EnumConst;
use macro_handler::{generate_handler, handler, from_path, export, perm, route};

#[derive(Deserialize)]
pub struct CreateRecordRequest {
    pub platform: String,
    pub code: String,
    pub code_language: String,
    pub url: String,
    pub problem_iden: String,
    pub public_status: bool,
}

#[derive(Deserialize, Clone)]
pub struct ListRecordsQuery {
    pub page: Option<u64>,
    pub per_page: Option<u64>,
    pub user: Option<String>,
    pub problem: Option<String>,
    pub status: Option<i64>,
    pub platform: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateStatusRequest {
    pub status: i64,
}

// View Handler - 查看记录
#[generate_handler]
mod view {
    use super::*;

    #[handler("/view")]
    pub struct View {
        basic: BasicHandler,
    }

    impl View {
        #[from_path(record_id)]
        #[export(record_node_id)]
        async fn before_resolve(&self, record_id: &str) -> ResultHandler<i64> {
            let record_node_id = record_id.parse::<i64>()
                .map_err(|e| HttpError::CoreError(rmjac_core::error::CoreError::StringError(format!("Invalid record_id: {}", e))))?;
            Ok(record_node_id)
        }

        #[handler]
        #[route("/view/{record_id}")]
        async fn get_view(&self, record_node_id: i64) -> ResultHandler<String> {
            let mut redis = get_redis_connection();
            let record = RecordNode::from_db(&self.basic.db, record_node_id).await?;
            let judge_data = {
                let mut store = (&self.basic.db, &mut redis);
                Record::new(record_node_id).status_by_id(&mut store).await?
            };
            Ok(Json! {
                "record": record,
                "judge_data": judge_data
            })
        }
    }
}

// Create Handler - 创建记录
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
            let user_node_id = if let Some(uc) = &self.basic.user_context && uc.is_real {
                uc.user_id
            } else {
                return false;
            };

            let system_id = rmjac_core::env::DEFAULT_NODES.lock().unwrap().default_system_node;
            check_system_perm(user_node_id, system_id, SystemPerm::CreateRecord.get_const_isize().unwrap() as i64) == 1
        }

        #[handler]
        #[route("/create/{problem_iden}")]
        async fn post_create(&self, problem_iden: &str, data: CreateRecordRequest) -> ResultHandler<String> {
            let mut redis = get_redis_connection();
            let (problem_node_id, statement_node_id) = {
                let mut store = (&self.basic.db, &mut redis);
                ProblemRepository::resolve(&mut store, problem_iden).await?
            };
            
            let user_id = self.basic.user_context.as_ref().unwrap().user_id;
            
            let record_props = RecordNewProp {
                platform: data.platform,
                code: data.code,
                code_language: data.code_language,
                url: data.url,
                statement_node_id,
                public_status: data.public_status,
            };
            
            let record = Record::create_archived(
                &self.basic.db,
                record_props,
                user_id,
                problem_node_id,
            ).await?;

            Ok(Json! {
                "message": "Record created successfully",
                "record": record
            })
        }
    }
}

// Manage Handler - 管理记录
#[generate_handler]
mod manage {
    use super::*;

    #[handler("/manage")]
    pub struct Manage {
        basic: BasicHandler,
    }

    impl Manage {
        #[from_path(record_id)]
        #[export(record_node_id)]
        async fn before_resolve(&self, record_id: &str) -> ResultHandler<i64> {
            let record_node_id = record_id.parse::<i64>()
                .map_err(|e| HttpError::CoreError(rmjac_core::error::CoreError::StringError(format!("Invalid record_id: {}", e))))?;
            Ok(record_node_id)
        }

        #[perm]
        async fn check_manage_perm(&self) -> bool {
            if let Some(uc) = &self.basic.user_context && uc.is_real {
                true
            } else {
                false
            }
        }

        #[handler]
        #[route("/manage/{record_id}/status")]
        async fn post_update_status(&self, record_node_id: i64, data: UpdateStatusRequest) -> ResultHandler<String> {
            let status: RecordStatus = data.status.into();
            let updated_record = Record::new(record_node_id).set_status(&self.basic.db, status).await?;
            
            Ok(Json! {
                "message": "Record status updated successfully",
                "record": updated_record
            })
        }

        #[handler]
        #[route("/manage/{record_id}/delete")]
        async fn post_delete(&self, record_node_id: i64) -> ResultHandler<String> {
            let deleted_record = Record::new(record_node_id).delete(&self.basic.db).await?;
            
            Ok(Json! {
                "message": "Record deleted successfully",
                "record": deleted_record
            })
        }
    }
}

// List Handler - 记录列表
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
        async fn get_list(&self, query: ListRecordsQuery) -> ResultHandler<String> {
            let page = query.page.unwrap_or(1);
            let per_page = query.per_page.unwrap_or(20);
            let mut redis = get_redis_connection();

            use rmjac_core::db::entity::edge::record::Column;
            use sea_orm::{ColumnTrait, PaginatorTrait};
            let mut filters = vec![];
            if let Some(status) = query.status {
                filters.push(Column::RecordStatus.eq(status));
            }
            if let Some(platform) = &query.platform {
                filters.push(Column::Platform.eq(platform.clone()));
            }

            use rmjac_core::db::entity::edge::record::Entity;
            let mut db_query = Entity::find();
            
            if let Some(user_search) = &query.user {
                if let Ok(user) = rmjac_core::db::entity::node::user::get_user_by_iden(&self.basic.db, user_search).await {
                    db_query = db_query.filter(Column::UNodeId.eq(user.node_id));
                } else if let Ok(user_id) = user_search.parse::<i64>() {
                    db_query = db_query.filter(Column::UNodeId.eq(user_id));
                }
            }

            if let Some(problem_search) = &query.problem {
                if let Ok((problem_node_id, _)) = {
                    let mut store = (&self.basic.db, &mut redis);
                    ProblemRepository::resolve(&mut store, problem_search).await
                } {
                    db_query = db_query.filter(Column::VNodeId.eq(problem_node_id));
                } else if let Ok(problem_id) = problem_search.parse::<i64>() {
                    db_query = db_query.filter(Column::VNodeId.eq(problem_id));
                }
            }

            for f in filters {
                db_query = db_query.filter(f);
            }

            let total = db_query.clone().count(&self.basic.db).await
                .map_err(|e| HttpError::CoreError(e.into()))?;

            let edges: Vec<rmjac_core::db::entity::edge::record::Model> = db_query
                .order_by_desc(Column::RecordNodeId)
                .offset((page - 1) * per_page)
                .limit(per_page)
                .all(&self.basic.db)
                .await
                .map_err(|e| HttpError::CoreError(e.into()))?;
                
            let mut records = vec![];
            for edge in edges {
                let record_edge: rmjac_core::graph::edge::record::RecordEdge = edge.into();
                let problem_node_id = record_edge.v;
                let node_type = rmjac_core::graph::action::get_node_type(&self.basic.db, problem_node_id).await.unwrap_or_default();
                
                let (problem_name, problem_iden) = if node_type == "problem_statement" {
                    let idens = rmjac_core::service::iden::get_node_id_iden(&self.basic.db, &mut redis, problem_node_id).await.unwrap_or_default();
                    let iden = idens.first().cloned().unwrap_or_else(|| "unknown".to_string());
                    
                    use rmjac_core::graph::edge::problem_statement::ProblemStatementEdgeQuery;
                    use rmjac_core::graph::edge::EdgeQuery;
                    let problem_node_ids = ProblemStatementEdgeQuery::get_u(problem_node_id, &self.basic.db).await.unwrap_or_default();
                    
                    let name = if let Some(&p_id) = problem_node_ids.first() {
                        let problem = rmjac_core::graph::node::problem::ProblemNode::from_db(&self.basic.db, p_id).await;
                        match problem {
                            Ok(p) => p.public.name,
                            Err(_) => "Unknown Problem".to_string(),
                        }
                    } else {
                        "Unknown Problem".to_string()
                    };
                    (name, iden)
                } else {
                    let problem = rmjac_core::graph::node::problem::ProblemNode::from_db(&self.basic.db, problem_node_id).await;
                    let idens = rmjac_core::service::iden::get_node_id_iden(&self.basic.db, &mut redis, problem_node_id).await.unwrap_or_default();
                    let iden = idens.first().cloned().unwrap_or_else(|| "unknown".to_string());
                    
                    match problem {
                        Ok(p) => (p.public.name, iden),
                        Err(_) => ("Unknown Problem".to_string(), iden),
                    }
                };

                let user = rmjac_core::graph::node::user::UserNode::from_db(&self.basic.db, record_edge.u).await;
                let (user_name, user_iden) = match user {
                    Ok(u) => (u.public.name, u.public.iden),
                    Err(_) => ("Unknown User".to_string(), "unknown".to_string()),
                };

                records.push(serde_json::json!({
                    "edge": record_edge,
                    "problem_name": problem_name,
                    "problem_iden": problem_iden,
                    "user_name": user_name,
                    "user_iden": user_iden,
                }));
            }

            Ok(Json! {
                "records": records,
                "page": page,
                "per_page": per_page,
                "total": total
            })
        }
    }
}

// Status Handler - 获取用户提交状态
#[generate_handler]
mod status {
    use super::*;

    #[handler("/status")]
    pub struct Status {
        basic: BasicHandler,
    }

    impl Status {
        #[perm]
        async fn check_status_perm(&self) -> bool {
            if let Some(uc) = &self.basic.user_context && uc.is_real {
                true
            } else {
                false
            }
        }

        #[handler]
        #[route("/status/{problem_iden}")]
        async fn get_status(&self, problem_iden: &str) -> ResultHandler<String> {
            let user_id = self.basic.user_context.as_ref().unwrap().user_id;
            let mut redis = get_redis_connection();
            let (problem_node_id, _) = {
                let mut store = (&self.basic.db, &mut redis);
                ProblemRepository::resolve(&mut store, problem_iden).await?
            };
            
            let status = RecordRepository::user_status(&self.basic.db, user_id, problem_node_id).await?;
            
            Ok(Json! {
                "user_id": user_id,
                "problem_id": problem_node_id,
                "status": status
            })
        }
    }
}

pub fn service() -> Scope {
    web::scope("/api/record")
        .service(view::View::export_http_service())
        .service(create::Create::export_http_service())
        .service(manage::Manage::export_http_service())
        .service(list::List::export_http_service())
        .service(status::Status::export_http_service())
}
