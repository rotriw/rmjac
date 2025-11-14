use enum_const::EnumConst;
use sea_orm::ColumnTrait;
use actix_web::{get, post, web, Scope, services, HttpRequest, HttpMessage};
use sea_orm::DatabaseConnection;
use sea_orm::sea_query::SimpleExpr;
use tap::Conv;
use rmjac_core::model::problem::{add_problem_statement_for_problem, delete_problem_connections, delete_problem_statement_for_problem, generate_problem_statement_schema, get_problem_with_node_id, modify_problem_statement, modify_problem_statement_source, CreateProblemProps, ProblemStatementProp};
use rmjac_core::model::perm::check_perm;
use rmjac_core::model::problem::get_problem_node_and_statement;
use rmjac_core::model::record::get_specific_node_records;
use rmjac_core::error::CoreError;
use rmjac_core::graph::edge::perm_problem::{PermProblemEdgeQuery, ProblemPerm, ProblemPermRaw};
use rmjac_core::graph::edge::perm_problem::ProblemPerm::ReadProblem;
use rmjac_core::db::entity::edge::record::Column as RecordEdgeColumn;
use rmjac_core::db::entity::node::problem_statement::ContentType;
use rmjac_core::graph::edge::perm_system::{PermSystemEdgeQuery, SystemPerm, SystemPermRaw};
use rmjac_core::utils::get_redis_connection;
use crate::handler::{BasicHandler, HttpError, ResultHandler};
use crate::handler::HandlerError::PermissionDenied;
use crate::utils::perm::UserAuthCotext;

pub struct View {
    basic: BasicHandler,
    problem_node_id: Option<i64>,
    problem_statement_node_id: Option<i64>,
    iden: Option<String>
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
            problem_node_id: None,
            problem_statement_node_id: None,
            iden: None,
        }
    }

    pub async fn before(self, iden: String) -> ResultHandler<Self> {
        // 展开题面
        let mut redis = get_redis_connection();
        let data = get_problem_node_and_statement(&self.basic.db, &mut redis, &iden).await?;
        let mut _res = self;
        _res.problem_node_id = Some(data.0);
        _res.problem_statement_node_id = Some(data.1);
        Ok(_res)
    }
    pub async fn perm(self) -> ResultHandler<Self> {
        // 用户是否具有此题阅读权限
        let user_node_id = if let Some(uc) = &self.basic.user_context && uc.is_real {
            uc.user_id
        } else {
            rmjac_core::env::DEFAULT_NODES.lock().unwrap().guest_user_node
        };
        let problem_node_id = self.problem_node_id.unwrap();
        let check = check_perm(
            &self.basic.db,
            user_node_id,
            problem_node_id,
            PermProblemEdgeQuery,
            ProblemPermRaw::Perms(vec![ReadProblem]).conv::<i32>() as i64
        ).await?;
        if check == 0 {
            return Err(HttpError::HandlerError(PermissionDenied))
        }
        Ok(self)
    }

    pub async fn exec(self) -> ResultHandler<String> {
        let node_id = self.problem_node_id;
        use rmjac_core::error::QueryNotFound;
        if node_id.is_none() {
            return Err(QueryNotFound::ProblemIdenNotFound.conv::<CoreError>().into());
        }
        let node_id = node_id.unwrap();
        let mut redis = get_redis_connection();
        let problem_node_id = &self.problem_node_id.unwrap();
        let problem_statement_node_id = &self.problem_statement_node_id.unwrap();
        let model = get_problem_with_node_id(&self.basic.db, &mut redis, *problem_node_id).await?;
        let get_user_ten_data = if let Some(uc) = &self.basic.user_context && uc.is_real {
            Some(get_specific_node_records::<SimpleExpr>(&self.basic.db, uc.user_id, 10, 1, vec![]).await?)
        } else {
            None
        };
        let get_user_accepted_data = if let Some(uc) = &self.basic.user_context && uc.is_real {
            Some(get_specific_node_records(&self.basic.db, uc.user_id, 1, 1, vec![
                RecordEdgeColumn::RecordStatus.eq("Accepted")
            ]).await?)
        } else {
            None
        };
        Ok(Json! {
            "model": model,
            "statement": problem_node_id,
            "user_recent_records": get_user_ten_data,
            "user_last_accepted_record": get_user_accepted_data
        })
    }
}
pub struct Create {
    basic: BasicHandler,
    problem: CreateProblemProps,
}

impl Create {
    pub fn entry(req: HttpRequest, db: DatabaseConnection, data: CreateProblemProps) -> Self {
        Self {
            basic: BasicHandler {
                db,
                req: req.clone(),
                user_context: req.extensions().get::<UserAuthCotext>().cloned()
            },
            problem: data,
        }
    }

    pub async fn perm(self) -> ResultHandler<Self> {
        let user = &self.basic.user_context;
        let system_id = rmjac_core::env::DEFAULT_NODES.lock().unwrap().default_system_node;
        if let Some(user) = user
            && user.is_real
            && check_perm(&self.basic.db, user.user_id, system_id, PermSystemEdgeQuery, SystemPerm::CreateProblem.get_const_isize().unwrap() as i64).await? == 1 {
            Ok(self)
        } else {
            Err(HttpError::HandlerError(PermissionDenied))
        }
    }

    pub async fn exec(self) -> ResultHandler<String> {
        let data = rmjac_core::model::problem::create_problem_with_user(&self.basic.db, &self.problem, true).await?;
        Ok(Json! {
            "data": data,
        })
    }
}


pub struct Manage {
    basic: BasicHandler,
    problem_node_id: i64,
    statement_node_id: i64,
    require_sudo: bool,
}

impl Manage {
    pub async fn entry_from_iden(req: HttpRequest, db: DatabaseConnection, problem_iden: &str, require_sudo: bool) -> ResultHandler<Self> {
        let mut redis = get_redis_connection();
        let (problem_node_id, statement_node_id) = get_problem_node_and_statement(&db, &mut redis, problem_iden).await?;
        Ok(Self {
            basic: BasicHandler {
                db,
                req: req.clone(),
                user_context: req.extensions().get::<UserAuthCotext>().cloned()
            },
            problem_node_id,
            statement_node_id,
            require_sudo
        })
    }

    pub async fn perm(self) -> ResultHandler<Self> {
        let user = &self.basic.user_context;
        if let Some(user) = user && user.is_real {
            let user_id = user.user_id;
            if self.require_sudo == false && check_perm(&self.basic.db, user_id, self.problem_node_id, PermProblemEdgeQuery, ProblemPerm::EditProblem.get_const_isize().unwrap() as i64).await? == 1 {
                return Ok(self);
            }
            if self.require_sudo == true && check_perm(&self.basic.db, user_id, self.problem_node_id, PermProblemEdgeQuery, ProblemPerm::OwnProblem.get_const_isize().unwrap() as i64).await? == 1 {
                return Ok(self);
            }
            let system_id = rmjac_core::env::DEFAULT_NODES.lock().unwrap().default_system_node;
            if check_perm(&self.basic.db, user_id, system_id, PermSystemEdgeQuery, SystemPerm::ProblemManage.get_const_isize().unwrap() as i64).await? == 1 {
                return Ok(self);
            }
        }
        Err(HttpError::HandlerError(PermissionDenied))
    }

    pub async fn delete(self) -> ResultHandler<String> {
        let mut redis = get_redis_connection();
        if self.statement_node_id != -1 {
            delete_problem_statement_for_problem(&self.basic.db, self.problem_node_id, self.statement_node_id).await?;
            // delete iden.
        } else {
            delete_problem_connections(&self.basic.db, &mut redis, self.problem_node_id).await?;
        }
         Ok(Json! {
            "message": format!("delete problem {}", self.problem_node_id),
        })
    }

    pub async fn add_statement(self, statement: ProblemStatementProp) -> ResultHandler<String> {
        let result = add_problem_statement_for_problem(&self.basic.db, self.problem_node_id, generate_problem_statement_schema(statement)).await?;
        Ok(Json! {
            "message": "success",
            "result": result,
        })
    }

    pub async fn update_statement_content(self, data: Vec<ContentType>) -> ResultHandler<String> {
        let mut redis = get_redis_connection();
        let result = modify_problem_statement(&self.basic.db, &mut redis, self.statement_node_id, data).await?;
        Ok(Json! {
            "message": "success",
            "result": result,
        })
    }

    pub async fn update_statement_source(self, new_source: &str) -> ResultHandler<String> {
        let mut redis = get_redis_connection();
        let result = modify_problem_statement_source(&self.basic.db, &mut redis, self.statement_node_id, new_source).await?;
        Ok(Json! {
            "message": "success",
            "result": result,
        })
    }

    pub async fn add_new_iden(self, new_iden: &str) -> ResultHandler<String> {
        // TODO.
        Ok(Json! {
            "message": "work in progress.",
        })
    }

    pub async fn add_new_editor(self, user_id: i64) -> ResultHandler<String> {
        // TODO.
        Ok(Json! {
            "message": "work in progress.",
        })
    }


    pub async fn view_editor(self, user_id: i64) -> ResultHandler<String> {
        // TODO.
        Ok(Json! {
            "message": "work in progress.",
        })
    }
    pub async fn remove_editor(self, manager: i64) -> ResultHandler<String> {
        // TODO.
        Ok(Json! {
            "message": "work in progress.",
        })
    }

    pub async fn add_visitor(self, user_id: i64) -> ResultHandler<String> {
        // TODO.
        Ok(Json! {
            "message": "work in progress.",
        })
    }

    pub async fn view_visitor(self, user_id: i64) -> ResultHandler<String> {
        // TODO.
        Ok(Json! {
            "message": "work in progress.",
        })
    }

    pub async fn remove_visitor(self, user_id: i64) -> ResultHandler<String> {
        // TODO.
        Ok(Json! {
            "message": "work in progress.",
        })
    }
    pub async fn transfer_owner(self, new_owner: i64) -> ResultHandler<String> {
        // TODO.
        Ok(Json! {
            "message": "work in progress.",
        })
    }

}

#[get("/view/{iden}")]
pub async fn get_view(req: HttpRequest, db: web::Data<DatabaseConnection>, data: web::Path<String>) -> ResultHandler<String> {
    let iden = data.into_inner();
    View::entry(req, db).before(iden).await?.perm().await?.exec().await
}

#[post("/view/{iden}")]
pub async fn post_view(req: HttpRequest, db: web::Data<DatabaseConnection>, data: web::Path<String>) -> ResultHandler<String> {
    let iden = data.into_inner();
    View::entry(req, db).before(iden).await?.perm().await?.exec().await
}

#[post("/create")]
pub async fn create_problem(req: HttpRequest, db: web::Data<DatabaseConnection>, data: web::Json<CreateProblemProps>) -> ResultHandler<String> {
    Create::entry(req, db.as_ref().clone(), data.into_inner()).perm().await?.exec().await
}


#[post("/manage/{iden}/delete")]
pub async fn delete_problem(req: HttpRequest, db: web::Data<DatabaseConnection>, data: web::Path<String>) -> ResultHandler<String> {
    let iden = data.into_inner();
    Manage::entry_from_iden(req, db.as_ref().clone(), &iden, true).await?.perm().await?.delete().await
}

#[post("/manage/{iden}/add_statement")]
pub async fn add_problem_statement(req: HttpRequest, db: web::Data<DatabaseConnection>, data: web::Path<String>, body: web::Json<ProblemStatementProp>) -> ResultHandler<String> {
    let iden = data.into_inner();
    Manage::entry_from_iden(req, db.as_ref().clone(), &iden, false).await?.perm().await?.add_statement(body.into_inner()).await
}

#[post("/manage/{iden}/update_statement_content")]
pub async fn update_problem_statement_content(req: HttpRequest, db: web::Data<DatabaseConnection>, data: web::Path<String>, body: web::Json<Vec<ContentType>>) -> ResultHandler<String> {
    let iden = data.into_inner();
    Manage::entry_from_iden(req, db.as_ref().clone(), &iden, false).await?.perm().await?.update_statement_content(body.into_inner()).await
}

#[post("/manage/{iden}/update_statement_source")]
pub async fn update_problem_statement_source(req: HttpRequest, db: web::Data<DatabaseConnection>, data: web::Path<String>, body: web::Json<String>) -> ResultHandler<String> {
    let iden = data.into_inner();
    Manage::entry_from_iden(req, db.as_ref().clone(), &iden, false).await?.perm().await?.update_statement_source(&body.into_inner()).await
}

#[post("/manage/{iden}/add_iden")]
pub async fn add_problem_iden(req: HttpRequest, db: web::Data<DatabaseConnection>, data: web::Path<String>, body: web::Json<String>) -> ResultHandler<String> {
    let iden = data.into_inner();
    Manage::entry_from_iden(req, db.as_ref().clone(), &iden, true).await?.perm().await?.add_new_iden(&body.into_inner()).await
}

#[post("/manage/{iden}/perm/add_editor")]
pub async fn add_problem_editor(req: HttpRequest, db: web::Data<DatabaseConnection>, data: web::Path<String>, body: web::Json<i64>) -> ResultHandler<String> {
    let iden = data.into_inner();
    Manage::entry_from_iden(req, db.as_ref().clone(), &iden, true).await?.perm().await?.add_new_editor(body.into_inner()).await
}

#[post("/manage/{iden}/perm/remove_editor")]
pub async fn remove_problem_editor(req: HttpRequest, db: web::Data<DatabaseConnection>, data: web::Path<String>, body: web::Json<i64>) -> ResultHandler<String> {
    let iden = data.into_inner();
    Manage::entry_from_iden(req, db.as_ref().clone(), &iden, true).await?.perm().await?.remove_editor(body.into_inner()).await
}

#[post("/manage/{iden}/perm/view_editor")]
pub async fn view_problem_editor(req: HttpRequest, db: web::Data<DatabaseConnection>, data: web::Path<String>, body: web::Json<i64>) -> ResultHandler<String> {
    let iden = data.into_inner();
    Manage::entry_from_iden(req, db.as_ref().clone(), &iden, false).await?.perm().await?.view_editor(body.into_inner()).await
}

#[post("/manage/{iden}/perm/add_visitor")]
pub async fn add_problem_visitor(req: HttpRequest, db: web::Data<DatabaseConnection>, data: web::Path<String>, body: web::Json<i64>) -> ResultHandler<String> {
    let iden = data.into_inner();
    Manage::entry_from_iden(req, db.as_ref().clone(), &iden, false).await?.perm().await?.add_visitor(body.into_inner()).await
}

#[post("/manage/{iden}/perm/remove_visitor")]
pub async fn remove_problem_visitor(req: HttpRequest, db: web::Data<DatabaseConnection>, data: web::Path<String>, body: web::Json<i64>) -> ResultHandler<String> {
    let iden = data.into_inner();
    Manage::entry_from_iden(req, db.as_ref().clone(), &iden, false).await?.perm().await?.remove_visitor(body.into_inner()).await
}

#[post("/manage/{iden}/perm/view_visitor")]
pub async fn view_problem_visitor(req: HttpRequest, db: web::Data<DatabaseConnection>, data: web::Path<String>, body: web::Json<i64>) -> ResultHandler<String> {
    let iden = data.into_inner();
    Manage::entry_from_iden(req, db.as_ref().clone(), &iden, false).await?.perm().await?.view_visitor(body.into_inner()).await
}

pub fn service() -> Scope {
    let service1 = services![
        get_view,
        post_view,
        create_problem,
        delete_problem,
        add_problem_statement,
        update_problem_statement_content,
        update_problem_statement_source,
        add_problem_iden,
        add_problem_editor,
    ];
    let service2 = services![
        remove_problem_editor,
        view_problem_editor,
        add_problem_visitor,
        remove_problem_visitor,
        view_problem_visitor,
    ];
    web::scope("/api/problem")
        .service(service1)
        .service(service2)
}