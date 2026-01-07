use enum_const::EnumConst;
use sea_orm::{ColumnTrait, QuerySelect};
use actix_web::{get, post, web, Scope, services, HttpRequest, HttpMessage};
use sea_orm::DatabaseConnection;
use sea_orm::sea_query::SimpleExpr;
use tap::Conv;
use rmjac_core::model::problem::{CreateProblemProps, ProblemListQuery, ProblemStatementProp, ProblemFactory, ProblemRepository, ProblemPermissionService, Problem, ProblemStatement};
use rmjac_core::model::perm::{check_problem_perm, check_system_perm};
use rmjac_core::model::record::RecordRepository;
use rmjac_core::error::CoreError;
use rmjac_core::graph::edge::{EdgeQuery, problem_statement::ProblemStatementEdgeQuery};
use rmjac_core::graph::edge::perm_problem::{PermProblemEdgeQuery, ProblemPerm, ProblemPermRaw};
use rmjac_core::graph::edge::perm_problem::ProblemPerm::ReadProblem;
use rmjac_core::db::entity::edge::record::Column as RecordEdgeColumn;
use rmjac_core::db::entity::node::problem_statement::ContentType;
use rmjac_core::graph::edge::perm_system::{PermSystemEdgeQuery, SystemPerm};
use rmjac_core::graph::node::record::RecordStatus;
use rmjac_core::utils::get_redis_connection;
use crate::handler::{BasicHandler, HttpError, ResultHandler};
use crate::handler::HandlerError::PermissionDenied;
use crate::utils::perm::UserAuthCotext;

pub struct View {
    basic: BasicHandler,
    problem_node_id: Option<i64>,
    problem_statement_node_id: Option<i64>,
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
        }
    }

    pub async fn before(self, iden: String) -> ResultHandler<Self> {
        // 展开题面
        let mut redis = get_redis_connection();
        let data = {
            let mut store = (&self.basic.db, &mut redis);
            ProblemRepository::resolve(&mut store, &iden).await?
        };
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
        let check = check_problem_perm(
            user_node_id,
            problem_node_id,
            ProblemPermRaw::Perms(vec![ReadProblem]).conv::<i32>() as i64
        );
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
        let _node_id = node_id.unwrap();
        let mut redis = get_redis_connection();
        let problem_node_id = &self.problem_node_id.unwrap();
        let problem_statement_node_id = &self.problem_statement_node_id.unwrap();
        let model = {
            let mut store = (&self.basic.db, &mut redis);
            ProblemRepository::model(&mut store, *problem_node_id).await?
        };
        let get_user_submit_data = if let Some(uc) = &self.basic.user_context && uc.is_real {
            let data = RecordRepository::by_user_statement(&self.basic.db, uc.user_id, self.problem_statement_node_id.unwrap(), 100, 1).await;
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
            "statement": problem_statement_node_id,
            "user_recent_records": get_user_submit_data,
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
            && check_system_perm(user.user_id, system_id, SystemPerm::CreateProblem.get_const_isize().unwrap() as i64) == 1 {
            Ok(self)
        } else {
            Err(HttpError::HandlerError(PermissionDenied))
        }
    }

    pub async fn exec(self) -> ResultHandler<String> {
        let mut redis = get_redis_connection();
        let data = {
            let mut store = (&self.basic.db, &mut redis);
            ProblemFactory::create_with_user(&mut store, &self.problem, true).await?
        };
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
        let (problem_node_id, statement_node_id) = {
            let mut store = (&db, &mut redis);
            ProblemRepository::resolve(&mut store, problem_iden).await?
        };
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
            if self.require_sudo == false && check_problem_perm(user_id, self.problem_node_id, ProblemPerm::EditProblem.get_const_isize().unwrap() as i64) == 1 {
                return Ok(self);
            }
            if self.require_sudo == true && check_problem_perm(user_id, self.problem_node_id, ProblemPerm::OwnProblem.get_const_isize().unwrap() as i64) == 1 {
                return Ok(self);
            }
            let system_id = rmjac_core::env::DEFAULT_NODES.lock().unwrap().default_system_node;
            if check_system_perm(user_id, system_id, SystemPerm::ProblemManage.get_const_isize().unwrap() as i64) == 1 {
                return Ok(self);
            }
        }
        Err(HttpError::HandlerError(PermissionDenied))
    }

    pub async fn delete(self) -> ResultHandler<String> {
        let mut redis = get_redis_connection();
        if self.statement_node_id != -1 {
            ProblemStatementEdgeQuery::delete(&self.basic.db, self.problem_node_id, self.statement_node_id).await?;
            // delete iden.
        } else {
            let mut store = (&self.basic.db, &mut redis);
            ProblemRepository::purge(&mut store, self.problem_node_id).await?;
        }
         Ok(Json! {
            "message": format!("delete problem {}", self.problem_node_id),
        })
    }

    pub async fn add_statement(self, statement: ProblemStatementProp) -> ResultHandler<String> {
        let mut redis = get_redis_connection();
        let result = {
            let mut store = (&self.basic.db, &mut redis);
            ProblemFactory::add_statement(&mut store, self.problem_node_id, ProblemFactory::generate_statement_schema(statement)).await?
        };
        Ok(Json! {
            "message": "success",
            "result": result,
        })
    }

    pub async fn update_statement_content(self, data: Vec<ContentType>) -> ResultHandler<String> {
        let mut redis = get_redis_connection();
        let result = {
            let mut store = (&self.basic.db, &mut redis);
            let stmt = ProblemStatement::new(self.statement_node_id);
            stmt.set_content(&mut store, data).await?
        };
        Ok(Json! {
            "message": "success",
            "result": result,
        })
    }

    pub async fn update_statement_source(self, new_source: &str) -> ResultHandler<String> {
        let mut redis = get_redis_connection();
        let result = {
            let mut store = (&self.basic.db, &mut redis);
            let stmt = ProblemStatement::new(self.statement_node_id);
            stmt.set_source(&mut store, new_source).await?
        };
        Ok(Json! {
            "message": "success",
            "result": result,
        })
    }

    pub async fn add_new_iden(self, _new_iden: &str) -> ResultHandler<String> {
        // TODO.
        Ok(Json! {
            "message": "work in progress.",
        })
    }

    pub async fn add_new_editor(self, user_id: i64) -> ResultHandler<String> {
        let mut redis = get_redis_connection();
        let store = (&self.basic.db, &mut redis);
        ProblemPermissionService::add_editor(&store, user_id, self.problem_node_id).await?;
        Ok(Json! {
            "message": "successful",
        })
    }


    pub async fn view_editor(self, _user_id: i64) -> ResultHandler<String> {
        Ok(Json! {
            "message": "work in progress.",
        })
    }
    pub async fn remove_editor(self, manager: i64) -> ResultHandler<String> {
        let mut redis = get_redis_connection();
        let store = (&self.basic.db, &mut redis);
        ProblemPermissionService::remove_editor(&store, manager, self.problem_node_id).await?;
        Ok(Json! {
            "message": "successful",
        })
    }

    pub async fn add_visitor(self, user_id: i64) -> ResultHandler<String> {
        let mut redis = get_redis_connection();
        let store = (&self.basic.db, &mut redis);
        ProblemPermissionService::add_viewer(&store, user_id, self.problem_node_id).await?;
        Ok(Json! {
            "message": "successful",
        })
    }

    pub async fn view_visitor(self, _user_id: i64) -> ResultHandler<String> {
        Ok(Json! {
            "message": "work in progress.",
        })
    }

    pub async fn remove_visitor(self, user_id: i64) -> ResultHandler<String> {
        let mut redis = get_redis_connection();
        let store = (&self.basic.db, &mut redis);
        ProblemPermissionService::remove_viewer(&store, user_id, self.problem_node_id).await?;
        Ok(Json! {
            "message": "successful",
        })
    }
    pub async fn transfer_owner(self, new_owner: i64) -> ResultHandler<String> {
        use rmjac_core::db::entity::edge::perm_problem::Column;
        let old_owner_id = self.basic.user_context.unwrap().user_id;
        let old_owners = PermProblemEdgeQuery::get_u_filter(self.problem_node_id, Column::UNodeId.eq(old_owner_id),  &self.basic.db).await?;
        if old_owners.contains(&old_owner_id) {
            let mut redis = get_redis_connection();
            let store = (&self.basic.db, &mut redis);
            ProblemPermissionService::remove_owner(&store, old_owner_id, self.problem_node_id).await?;
        }
        let mut redis = get_redis_connection();
        let store = (&self.basic.db, &mut redis);
        ProblemPermissionService::add_owner(&store, new_owner, self.problem_node_id).await?;
        Ok(Json! {
            "message": "successful",
        })
    }

}

pub struct List {
    basic: BasicHandler,
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
        Ok(self)
    }

    pub async fn exec(self, query: ProblemListQuery) -> ResultHandler<String> {
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
            } else if let Ok(user_id) = author_search.parse::<i64>() {
                Some(user_id)
            } else {
                None
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

#[get("/list")]
pub async fn list_problems(
    req: HttpRequest,
    db: web::Data<DatabaseConnection>,
    query: web::Query<ProblemListQuery>
) -> ResultHandler<String> {
    List::entry(req, db)
        .perm().await?
        .exec(query.into_inner()).await
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

#[post("/test/add_task")]
pub async fn test_add_task(_req: HttpRequest, task: web::Json<serde_json::Value>) -> ResultHandler<String> {
    use rmjac_core::service::socket::service::add_task;
    let success = add_task(&task.into_inner()).await;
    Ok(Json! {
        "success": success,
    })
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
        list_problems,
    ];
    let service2 = services![
        remove_problem_editor,
        view_problem_editor,
        add_problem_visitor,
        remove_problem_visitor,
        view_problem_visitor,
        test_add_task,
    ];
    web::scope("/api/problem")
        .service(service1)
        .service(service2)
}