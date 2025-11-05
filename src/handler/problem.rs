use sea_orm::ColumnTrait;
use actix_web::{get, post, web, Scope, services, HttpRequest, HttpMessage};
use sea_orm::DatabaseConnection;
use sea_orm::sea_query::SimpleExpr;
use tap::Conv;
use rmjac_core::model::problem::get_problem;
use rmjac_core::error::CoreError;
use rmjac_core::graph::edge::perm_problem::{PermProblemEdgeQuery, ProblemPermRaw};
use rmjac_core::graph::edge::perm_problem::ProblemPerm::ReadProblem;
use rmjac_core::model::perm::check_perm;
use rmjac_core::model::problem::get_problem_node_and_statement;
use rmjac_core::model::record::get_specific_node_records;
use crate::utils::perm::UserAuthCotext;
use rmjac_core::db::entity::edge::record::Column as RecordEdgeColumn;

use rmjac_core::utils::get_redis_connection;
use crate::handler::{HttpError, ResultHandler};
use crate::handler::HandlerError::PermissionDenied;

pub struct View {
    db: DatabaseConnection,
    user_context: Option<UserAuthCotext>,
    req: HttpRequest,
    problem_node_id: Option<i64>,
    problem_statement_node_id: Option<i64>,
    iden: Option<String>
}

impl View {

    pub fn entry(req: HttpRequest, db: web::Data<DatabaseConnection>) -> Self {
        let req_cloned = req.clone();
        Self {
            db: db.get_ref().clone(),
            user_context: req.extensions().get::<UserAuthCotext>().cloned(),
            problem_node_id: None,
            problem_statement_node_id: None,
            iden: None,
            req: req_cloned
        }
    }

    pub async fn before(self, iden: String) -> ResultHandler<Self> {
        // 展开题面
        let mut redis = get_redis_connection();
        let data = get_problem_node_and_statement(&self.db, &mut redis, &iden).await?;
        let mut _res = self;
        _res.problem_node_id = Some(data.0);
        _res.problem_statement_node_id = Some(data.1);
        Ok(_res)
    }
    pub async fn perm(self) -> ResultHandler<Self> {
        // 用户是否具有此题阅读权限
        let user_node_id = if let Some(uc) = &self.user_context && uc.is_real {
            uc.user_id
        } else {
            rmjac_core::env::DEFAULT_NODES.lock().unwrap().guest_user_node
        };
        let problem_node_id = self.problem_node_id.unwrap();
        let check = check_perm(
            &self.db,
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
        let iden = self.iden.unwrap();
        let (model, statement) = get_problem(&self.db, &mut redis, &iden).await?;
        let get_user_ten_data = if let Some(uc) = &self.user_context && uc.is_real {
            Some(get_specific_node_records::<SimpleExpr>(&self.db, uc.user_id, 10, 1, vec![]).await?)
        } else {
            None
        };

        let get_user_accepted_data = if let Some(uc) = &self.user_context && uc.is_real {
            Some(get_specific_node_records(&self.db, uc.user_id, 1, 1, vec![
                RecordEdgeColumn::RecordStatus.eq("Accepted")
            ]).await?)
        } else {
            None
        };
        Ok(Json! {
            "model": model,
            "statement": statement,
            "user_recent_records": get_user_ten_data,
            "user_last_accepted_record": get_user_accepted_data
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

pub fn service() -> Scope {
    let service = services![
        get_view,
        post_view
    ];
    web::scope("/api/problem")
        .service(service)
}