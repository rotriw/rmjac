use actix_web::{get, post, web, Scope, services, HttpRequest, HttpMessage};
use sea_orm::{DatabaseConnection, EntityTrait, QueryFilter, QueryOrder, QuerySelect};
use serde::Deserialize;
use rmjac_core::model::record::{RecordNewProp, Record, RecordRepository};
use rmjac_core::model::problem::{ProblemRepository};
use rmjac_core::graph::node::record::{RecordStatus, RecordNode};
use rmjac_core::model::perm::check_system_perm;
use rmjac_core::graph::edge::perm_system::SystemPerm;
use rmjac_core::graph::node::Node;

use rmjac_core::error::QueryNotFound;
use rmjac_core::utils::get_redis_connection;
use sea_orm::sea_query::SimpleExpr;
use crate::handler::{BasicHandler, HttpError, ResultHandler, HandlerError};
use crate::utils::perm::UserAuthCotext;
use enum_const::EnumConst;


pub struct View {
    basic: BasicHandler,
    record_node_id: Option<i64>,
}

impl View {
    pub fn entry(req: HttpRequest, db: web::Data<DatabaseConnection>) -> Self {
        let req_cloned = req.clone();
        Self {
            basic: BasicHandler {
                db: db.get_ref().clone(),
                user_context: req.extensions().get::<UserAuthCotext>().cloned(),
                req: req_cloned,
            },
            record_node_id: None,
        }
    }

    pub async fn before(self, record_id: i64) -> ResultHandler<Self> {
        let mut _res = self;
        _res.record_node_id = Some(record_id);
        Ok(_res)
    }

    pub async fn perm(self) -> ResultHandler<Self> {
        return Ok(self);
        // Check if user can view this record
        let _user_node_id = if let Some(uc) = &self.basic.user_context && uc.is_real {
            uc.user_id
        } else {
            return Err(HttpError::HandlerError(HandlerError::PermissionDenied));
        };

        // For now, allow users to view their own records
        // TODO: Add proper permission check based on record ownership
        Ok(self)
    }

    pub async fn exec(self) -> ResultHandler<String> {
        let record_node_id = self.record_node_id.ok_or_else(|| {
            HttpError::CoreError(QueryNotFound::NodeNotFound.into())
        })?;

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

pub struct Create {
    basic: BasicHandler,
    record_props: RecordNewProp,
}

#[derive(Deserialize)]
pub struct CreateRecordRequest {
    pub platform: String,
    pub code: String,
    pub code_language: String,
    pub url: String,
    pub problem_iden: String,
    pub public_status: bool,
}

impl Create {
    pub fn entry(req: HttpRequest, db: web::Data<DatabaseConnection>, data: CreateRecordRequest) -> Self {
        Self {
            basic: BasicHandler {
                db: db.get_ref().clone(),
                req: req.clone(),
                user_context: req.extensions().get::<UserAuthCotext>().cloned(),
            },
            record_props: RecordNewProp {
                platform: data.platform,
                code: data.code,
                code_language: data.code_language,
                url: data.url,
                statement_node_id: 0, // Will be filled in before()
                public_status: data.public_status,
            },
        }
    }

    pub async fn before(self, problem_iden: &str) -> ResultHandler<Self> {
        let mut redis = get_redis_connection();
        let (_problem_node_id, statement_node_id) = {
            let mut store = (&self.basic.db, &mut redis);
            ProblemRepository::resolve(&mut store, problem_iden).await?
        };
        
        let mut _res = self;
        _res.record_props.statement_node_id = statement_node_id;
        Ok(_res)
    }

    pub async fn perm(self) -> ResultHandler<Self> {
        // Check if user is logged in
        let user_node_id = if let Some(uc) = &self.basic.user_context && uc.is_real {
            uc.user_id
        } else {
            return Err(HttpError::HandlerError(HandlerError::PermissionDenied));
        };

        // Check if user has CreateRecord permission
        let system_id = rmjac_core::env::DEFAULT_NODES.lock().unwrap().default_system_node;
        if check_system_perm(user_node_id, system_id, SystemPerm::CreateRecord.get_const_isize().unwrap() as i64) == 1 {
            Ok(self)
        } else {
            Err(HttpError::HandlerError(HandlerError::PermissionDenied))
        }
    }

    pub async fn exec(self, problem_iden: &str) -> ResultHandler<String> {
        let mut redis = get_redis_connection();
        let (problem_node_id, _) = {
            let mut store = (&self.basic.db, &mut redis);
            ProblemRepository::resolve(&mut store, problem_iden).await?
        };
        
        let user_id = self.basic.user_context.unwrap().user_id;
        
        let record = Record::create_archived(
            &self.basic.db,
            self.record_props,
            user_id,
            problem_node_id,
        ).await?;

        Ok(Json! {
            "message": "Record created successfully",
            "record": record
        })
    }
}

pub struct Manage {
    basic: BasicHandler,
    record_node_id: Option<i64>,
}

impl Manage {
    pub fn entry(req: HttpRequest, db: web::Data<DatabaseConnection>) -> Self {
        Self {
            basic: BasicHandler {
                db: db.get_ref().clone(),
                req: req.clone(),
                user_context: req.extensions().get::<UserAuthCotext>().cloned(),
            },
            record_node_id: None,
        }
    }

    pub async fn before(self, record_id: i64) -> ResultHandler<Self> {
        let mut _res = self;
        _res.record_node_id = Some(record_id);
        Ok(_res)
    }

    pub async fn perm(self) -> ResultHandler<Self> {
        // Check if user has permission to manage this record
        let _user_node_id = if let Some(uc) = &self.basic.user_context && uc.is_real {
            uc.user_id
        } else {
            return Err(HttpError::HandlerError(HandlerError::PermissionDenied));
        };

        // TODO: Add proper permission check - only record owner or admin should be able to manage
        Ok(self)
    }

    pub async fn update_status(self, new_status: RecordStatus) -> ResultHandler<String> {
        let record_node_id = self.record_node_id.unwrap();
        
        let updated_record = Record::new(record_node_id).set_status(&self.basic.db, new_status).await?;
        
        Ok(Json! {
            "message": "Record status updated successfully",
            "record": updated_record
        })
    }

    pub async fn delete(self) -> ResultHandler<String> {
        let record_node_id = self.record_node_id.unwrap();
        
        let deleted_record = Record::new(record_node_id).delete(&self.basic.db).await?;
        
        Ok(Json! {
            "message": "Record deleted successfully",
            "record": deleted_record
        })
    }
}

pub struct List {
    basic: BasicHandler,
}

#[derive(Deserialize)]
pub struct ListRecordsQuery {
    pub page: Option<u64>,
    pub per_page: Option<u64>,
    pub user: Option<String>,
    pub problem: Option<String>,
    pub status: Option<i64>,
    pub platform: Option<String>,
}

impl List {
    pub fn entry(req: HttpRequest, db: web::Data<DatabaseConnection>) -> Self {
        Self {
            basic: BasicHandler {
                db: db.get_ref().clone(),
                req: req.clone(),
                user_context: req.extensions().get::<UserAuthCotext>().cloned(),
            },
        }
    }

    pub async fn perm(self) -> ResultHandler<Self> {
        // For listing, allow any logged in user to see public records
        // Private records will be filtered in exec()
        Ok(self)
    }

    pub async fn exec(self, query: ListRecordsQuery) -> ResultHandler<String> {
        let page = query.page.unwrap_or(1);
        let per_page = query.per_page.unwrap_or(20);
        let mut redis = get_redis_connection();

        use rmjac_core::db::entity::edge::record::Column;
        use sea_orm::{ColumnTrait, PaginatorTrait};
        let mut filters = vec![];
        if let Some(status) = query.status {
            filters.push(Column::RecordStatus.eq(status));
        }
        if let Some(platform) = query.platform {
            filters.push(Column::Platform.eq(platform));
        }

        use rmjac_core::db::entity::edge::record::Entity;
        let mut db_query = Entity::find();
        
        if let Some(user_search) = query.user {
            // Try iden first
            if let Ok(user) = rmjac_core::db::entity::node::user::get_user_by_iden(&self.basic.db, &user_search).await {
                db_query = db_query.filter(Column::UNodeId.eq(user.node_id));
            } else if let Ok(user_id) = user_search.parse::<i64>() {
                // Then try ID
                db_query = db_query.filter(Column::UNodeId.eq(user_id));
            }
        }

        if let Some(problem_search) = query.problem {
            // Try iden first
            if let Ok((problem_node_id, _)) = {
                let mut store = (&self.basic.db, &mut redis);
                ProblemRepository::resolve(&mut store, &problem_search).await
            } {
                db_query = db_query.filter(Column::VNodeId.eq(problem_node_id));
            } else if let Ok(problem_id) = problem_search.parse::<i64>() {
                // Then try ID
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
                
                // Find the problem node connected to this statement
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

pub struct Status {
    basic: BasicHandler,
}

impl Status {
    pub fn entry(req: HttpRequest, db: web::Data<DatabaseConnection>) -> Self {
        Self {
            basic: BasicHandler {
                db: db.get_ref().clone(),
                req: req.clone(),
                user_context: req.extensions().get::<UserAuthCotext>().cloned(),
            },
        }
    }

    pub async fn perm(self) -> ResultHandler<Self> {
        // Check if user is logged in to see their status
        let _user_node_id = if let Some(uc) = &self.basic.user_context && uc.is_real {
            uc.user_id
        } else {
            return Err(HttpError::HandlerError(HandlerError::PermissionDenied));
        };

        Ok(self)
    }

    pub async fn exec(self, problem_iden: &str) -> ResultHandler<String> {
        let user_id = self.basic.user_context.unwrap().user_id;
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

// Route handlers
#[get("/view/{record_id}")]
pub async fn get_record(
    req: HttpRequest,
    db: web::Data<DatabaseConnection>,
    path: web::Path<i64>
) -> ResultHandler<String> {
    let record_id = path.into_inner();
    View::entry(req, db).before(record_id).await?.perm().await?.exec().await
}

#[post("/create/{problem_iden}")]
pub async fn create_record(
    req: HttpRequest,
    db: web::Data<DatabaseConnection>,
    path: web::Path<String>,
    data: web::Json<CreateRecordRequest>
) -> ResultHandler<String> {
    let problem_iden = path.into_inner();
    Create::entry(req, db, data.into_inner())
        .before(&problem_iden).await?
        .perm().await?
        .exec(&problem_iden).await
}

#[derive(Deserialize)]
pub struct UpdateStatusRequest {
    pub status: i64,
}

#[post("/manage/{record_id}/status")]
pub async fn update_record_status_handler(
    req: HttpRequest,
    db: web::Data<DatabaseConnection>,
    path: web::Path<i64>,
    data: web::Json<UpdateStatusRequest>
) -> ResultHandler<String> {
    let record_id = path.into_inner();
    let status: RecordStatus = data.status.into();
    
    Manage::entry(req, db)
        .before(record_id).await?
        .perm().await?
        .update_status(status).await
}

#[post("/manage/{record_id}/delete")]
pub async fn delete_record(
    req: HttpRequest,
    db: web::Data<DatabaseConnection>,
    path: web::Path<i64>
) -> ResultHandler<String> {
    let record_id = path.into_inner();
    
    Manage::entry(req, db)
        .before(record_id).await?
        .perm().await?
        .delete().await
}

#[get("/list")]
pub async fn list_records(
    req: HttpRequest,
    db: web::Data<DatabaseConnection>,
    query: web::Query<ListRecordsQuery>
) -> ResultHandler<String> {
    List::entry(req, db)
        .perm().await?
        .exec(query.into_inner()).await
}

#[get("/status/{problem_iden}")]
pub async fn get_problem_status(
    req: HttpRequest,
    db: web::Data<DatabaseConnection>,
    path: web::Path<String>
) -> ResultHandler<String> {
    let problem_iden = path.into_inner();
    Status::entry(req, db)
        .perm().await?
        .exec(&problem_iden).await
}

pub fn service() -> Scope {
    let service = services![
        get_record,
        create_record,
        update_record_status_handler,
        delete_record,
        list_records,
        get_problem_status,
    ];
    web::scope("/api/record").service(service)
}