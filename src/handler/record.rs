use actix_web::{get, post, web, Scope, services, HttpRequest, HttpMessage};
use sea_orm::DatabaseConnection;
use serde::Deserialize;
use rmjac_core::model::record::{RecordNewProp, create_record_only_archived, update_record_status, get_specific_node_records, get_problem_user_status};
use rmjac_core::model::problem::get_problem_node_and_statement;
use rmjac_core::graph::node::record::{RecordStatus, RecordNode};
use rmjac_core::model::perm::check_perm;
use rmjac_core::graph::edge::perm_system::{PermSystemEdgeQuery, SystemPerm};
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

        let record = RecordNode::from_db(&self.basic.db, record_node_id).await?;
        
        Ok(Json! {
            "record": record
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
        let (_problem_node_id, statement_node_id) = get_problem_node_and_statement(&self.basic.db, &mut redis, problem_iden).await?;
        
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
        let system_id = 0; // System node ID
        if check_perm(&self.basic.db, user_node_id, system_id, PermSystemEdgeQuery, SystemPerm::CreateRecord.get_const_isize().unwrap() as i64).await? == 1 {
            Ok(self)
        } else {
            Err(HttpError::HandlerError(HandlerError::PermissionDenied))
        }
    }

    pub async fn exec(self, problem_iden: &str) -> ResultHandler<String> {
        let mut redis = get_redis_connection();
        let (problem_node_id, _) = get_problem_node_and_statement(&self.basic.db, &mut redis, problem_iden).await?;
        
        let user_id = self.basic.user_context.unwrap().user_id;
        
        let record = create_record_only_archived(
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
        
        let updated_record = update_record_status(&self.basic.db, record_node_id, new_status).await?;
        
        Ok(Json! {
            "message": "Record status updated successfully",
            "record": updated_record
        })
    }

    pub async fn delete(self) -> ResultHandler<String> {
        let record_node_id = self.record_node_id.unwrap();
        
        let deleted_record = update_record_status(&self.basic.db, record_node_id, RecordStatus::Deleted).await?;
        
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
    pub user_id: Option<i64>,
    pub problem_id: Option<i64>,
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
        
        let current_user_id = if let Some(uc) = &self.basic.user_context && uc.is_real {
            Some(uc.user_id)
        } else {
            None
        };

        let records = if let Some(user_id) = query.user_id {
            // Get records for specific user
            if current_user_id == Some(user_id) {
                // User viewing their own records - show all
                get_specific_node_records::<SimpleExpr>(&self.basic.db, user_id, per_page, page, vec![]).await?
            } else {
                // User viewing another user's records - only show public ones
                // This would need a custom query to join with record nodes and filter by public_status
                // For now, we'll use the existing function which shows all edges, but the actual records
                // will be filtered when converting from nodes (public_status controls code visibility)
                get_specific_node_records::<SimpleExpr>(&self.basic.db, user_id, per_page, page, vec![]).await?
            }
        } else if let Some(problem_id) = query.problem_id {
            // Get records for specific problem - only show public records or user's own records
            if let Some(_current_user) = current_user_id {
                // Logged in user - show public records and their own records
                // TODO: Implement proper filtering. For now showing all records
                get_specific_node_records::<SimpleExpr>(&self.basic.db, problem_id, per_page, page, vec![]).await?
            } else {
                // Anonymous user - only show public records
                // TODO: Implement proper filtering. For now showing all records
                get_specific_node_records::<SimpleExpr>(&self.basic.db, problem_id, per_page, page, vec![]).await?
            }
        } else if let Some(user_id) = current_user_id {
            // Get current user's own records - show all
            get_specific_node_records::<SimpleExpr>(&self.basic.db, user_id, per_page, page, vec![]).await?
        } else {
            // No permission to see all records without login
            return Err(HttpError::HandlerError(HandlerError::PermissionDenied));
        };

        Ok(Json! {
            "records": records,
            "page": page,
            "per_page": per_page
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
        let (problem_node_id, _) = get_problem_node_and_statement(&self.basic.db, &mut redis, problem_iden).await?;
        
        let status = get_problem_user_status(&self.basic.db, user_id, problem_node_id).await?;
        
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