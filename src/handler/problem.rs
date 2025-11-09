use sea_orm::ColumnTrait;
use actix_web::{get, post, web, Scope, services, HttpRequest, HttpMessage};
use sea_orm::DatabaseConnection;
use sea_orm::sea_query::SimpleExpr;
use tap::Conv;
use rmjac_core::model::problem::{get_problem_with_node_id, CreateProblemProps};
use rmjac_core::model::perm::check_perm;
use rmjac_core::model::problem::get_problem_node_and_statement;
use rmjac_core::model::record::get_specific_node_records;
use rmjac_core::error::CoreError;
use rmjac_core::graph::edge::perm_problem::{PermProblemEdgeQuery, ProblemPermRaw};
use rmjac_core::graph::edge::perm_problem::ProblemPerm::ReadProblem;
use rmjac_core::db::entity::edge::record::Column as RecordEdgeColumn;
use rmjac_core::graph::edge::perm_system::PermSystemEdgeQuery;
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
    pub async fn entry(req: HttpRequest, db: DatabaseConnection, data: CreateProblemProps) -> Self {
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
        let system_id = -1; // get system id
        if let Some(user) = user
            && user.is_real
            && check_perm(&self.basic.db, user.user_id, system_id, PermSystemEdgeQuery, 1).await? == 1 {
            Ok(self)
        } else {
            Err(HttpError::HandlerError(PermissionDenied))
        }
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

pub fn service() -> Scope {
    let service = services![
        get_view,
        post_view
    ];
    web::scope("/api/problem")
        .service(service)
}