use actix_web::{HttpMessage, HttpRequest, Scope, get, post, services, web};
use chrono::NaiveDateTime;
use enum_const::EnumConst;
use redis::TypedCommands;
use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};
use rmjac_core::graph::edge::Edge;
use rmjac_core::graph::edge::perm_pages::PagesPerm;
use rmjac_core::graph::edge::perm_system::SystemPerm;
use rmjac_core::graph::edge::training_problem::TrainingProblemEdge;
use rmjac_core::model::perm::{check_pages_perm, check_system_perm};
use crate::handler::{BasicHandler, HttpError, ResultHandler};
use rmjac_core::model::training::{Training, TrainingList};

use rmjac_core::utils::get_redis_connection;
use crate::handler::HandlerError::PermissionDenied;
use crate::utils::perm::UserAuthCotext;

pub struct Create {
    basic: BasicHandler,
}

#[derive(Deserialize, Serialize, Clone, Debug)]
pub struct CreateProps {
    pub iden: String,
    pub title: String,
    pub description_public: String,
    pub description_private: String,
    pub start_time: NaiveDateTime,
    pub end_time: NaiveDateTime,
    pub training_type: String,
    pub problem_list: TrainingList,
    pub write_perm_user: Vec<i64>,
    pub read_perm_user: Vec<i64>,
}


impl Create {
    pub fn new(req: HttpRequest, db: DatabaseConnection) -> Self {
        Self {
            basic: BasicHandler {
                db,
                req: req.clone(),
                user_context: req.extensions().get::<UserAuthCotext>().cloned()
            }
        }
    }

    pub async fn check_perm(self) -> ResultHandler<Self> {
        let user = &self.basic.user_context;
        if let Some(user) = user
            && user.is_real{
            Ok(self)
        } else {
            Err(HttpError::HandlerError(PermissionDenied))
        }
    }

    pub async fn run(self, data: CreateProps) -> ResultHandler<String> {
        let mut redis = get_redis_connection();
        let mut store = (&self.basic.db, &mut redis);
        let user_id = self.basic.user_context.as_ref().unwrap().user_id;
        let data = Training::create_as(
            &mut store,
            &data.title,
            &user_id.to_string(),
            &data.iden,
            &data.description_public,
            &data.description_private,
            data.start_time,
            data.end_time,
            &data.training_type,
            &data.problem_list,
            data.write_perm_user,
            data.read_perm_user,
            user_id,
        )
        .await?;
        Ok(Json! {
            "data": data,
        })
    }
}


pub struct Manage {
    basic: BasicHandler,
    node_id: Option<i64>
}


impl Manage {
    pub fn new(req: HttpRequest, db: DatabaseConnection) -> Self {
        Self {
            basic: BasicHandler {
                db,
                req: req.clone(),
                user_context: req.extensions().get::<UserAuthCotext>().cloned()
            },
            node_id: None,
        }
    }

    pub async fn load(self, user_iden: &str, problem_iden: &str) -> ResultHandler<Self> {
        let mut redis = get_redis_connection();
        let mut store = (&self.basic.db, &mut redis);
        let node_id = Training::node_id(&mut store, user_iden, problem_iden).await?;
        Ok(Self {
            node_id: Some(node_id),
            ..self
        })
    }

    pub async fn check_perm(self, require_sudo: bool) -> ResultHandler<Self> {
        let user = &self.basic.user_context;
        let node_id = self.node_id.unwrap();
        if let Some(user) = user
            && user.is_real {
            if require_sudo == false && check_pages_perm(user.user_id, node_id, PagesPerm::EditPages.get_const_isize().unwrap() as i64) == 1 {
                return Ok(self);
            }

            if check_system_perm(user.user_id, node_id, PagesPerm::DeletePages.get_const_isize().unwrap() as i64) == 1 {
                return Ok(self);
            }

            if check_system_perm(user.user_id, node_id, SystemPerm::ManageAllTraining.get_const_isize().unwrap() as i64) == 1 {
                return Ok(self);
            }
        }
        Err(HttpError::HandlerError(PermissionDenied))
    }

    pub async fn add_problems(self, list_node_id: i64, problem: Vec<String>) -> ResultHandler<String> {
        let node_id = self.node_id.unwrap();
        let mut redis = get_redis_connection();
            let mut store = (&self.basic.db, &mut redis);
            let p_id = Training::root_id(&mut store, node_id).await?;
        // check problem_list is in node
            if Training::has_list(&mut store, p_id, list_node_id).await? == false {
            return Ok(Json! {
                "status": "error",
                "message": "problem list not in training",
            });
        }
        let mut result = vec![];
        for p in &problem {
                let feedback = Training::add_by_iden(&mut store, list_node_id, p).await;
            if let Err(e) = feedback {
                return Ok(Json! {
                    "message": format!("add problem {} failed: {}", p, e),
                    "successful_data": result,
                });
            }
            result = feedback.unwrap();
        }
        Ok(Json! {
            "message": "successful",
            "successful_data": result,
        })
    }

    pub async fn add_list(self, list_node_id: i64, new_problem_list: TrainingList) -> ResultHandler<String> {
        let node_id = self.node_id.unwrap();
        let mut redis = get_redis_connection();
        let mut store = (&self.basic.db, &mut redis);
        let p_id = Training::root_id(&mut store, node_id).await?;
        // check problem_list is in node
        if Training::has_list(&mut store, p_id, list_node_id).await? == false {
            return Ok(Json! {
                "status": "error",
                "message": "problem list not in training",
            });
        }
        let new_node = Training::build_list(&mut store, &new_problem_list, list_node_id).await?;
        Ok(Json! {
            "message": "successful",
            "successful_data": new_node,
        })
    }

    pub async fn modify_desc(self, list_node_id: i64, new_description_public: &str, new_description_private: &str) -> ResultHandler<String> {
        let node_id = self.node_id.unwrap();
        let mut redis = get_redis_connection();
        let mut store = (&self.basic.db, &mut redis);
        let p_id = Training::root_id(&mut store, node_id).await?;
        // check problem_list is in node
        if Training::has_list(&mut store, p_id, list_node_id).await? == false {
            return Ok(Json! {
                "status": "error",
                "message": "problem list not in training",
            });
        }
        Training::set_desc(&mut store, list_node_id, new_description_public, new_description_private).await?;
        Ok(Json! {
            "message": "successful",
        })
    }

    pub async fn rm_problem(self, list_node_id: i64, delete_edge_id: i64) -> ResultHandler<String> {
        let node_id = self.node_id.unwrap();
        let mut redis = get_redis_connection();
        let edge = TrainingProblemEdge::from_db(&self.basic.db, delete_edge_id).await?;
        if  edge.u != list_node_id {
            return Ok(Json! {
                "status": "error",
                "message": "mismatched list node id and edge",
            });
        }
        let _ = edge.delete(&self.basic.db).await?;
        let _ = redis.del::<_>(format!("training_{node_id}"));
        Ok(Json! {
            "message": "successful",
        })
    }

    pub async fn update_order(self, list_node_id: i64, orders: Vec<(i64, i64)>) -> ResultHandler<String> {
        let node_id = self.node_id.unwrap();
        let mut redis = get_redis_connection();
        let mut store = (&self.basic.db, &mut redis);
        let p_id = Training::root_id(&mut store, node_id).await?;
        if Training::has_list(&mut store, p_id, list_node_id).await? == false {
            return Ok(Json! {
                "status": "error",
                "message": "problem list not in training",
            });
        }
        Training::set_order(&mut store, list_node_id, orders).await?;
        Ok(Json! {
            "message": "successful",
        })
    }
}

pub struct View {
    basic: BasicHandler,
    node_id: Option<i64>
}

impl View {
    pub fn new(req: HttpRequest, db: DatabaseConnection) -> Self {
        Self {
            basic: BasicHandler {
                db,
                req: req.clone(),
                user_context: req.extensions().get::<UserAuthCotext>().cloned()
            },
            node_id: None,
        }
    }

    pub async fn load(self, user_iden: &str, problem_iden: &str) -> ResultHandler<Self> {
        let mut redis = get_redis_connection();
        let mut store = (&self.basic.db, &mut redis);
        let node_id = Training::node_id(&mut store, user_iden, problem_iden).await?;
        Ok(Self {
            node_id: Some(node_id),
            ..self
        })
    }

    pub async fn check_perm(self) -> ResultHandler<Self> {
        let user = &self.basic.user_context;
        let node_id = self.node_id.unwrap();
        if let Some(user) = user
            && user.is_real {
            if check_pages_perm(user.user_id, node_id, PagesPerm::ReadPages.get_const_isize().unwrap() as i64) == 1 {
                return Ok(self);
            }
            if check_system_perm(user.user_id, node_id, SystemPerm::ManageAllTraining.get_const_isize().unwrap() as i64) == 1 {
                return Ok(self);
            }
        }
        Err(HttpError::HandlerError(PermissionDenied))
    }

    pub async fn get(self) -> ResultHandler<String> {
        let node_id = self.node_id.unwrap();
        let mut redis = get_redis_connection();
        let mut store = (&self.basic.db, &mut redis);
        let training = Training::get(&mut store, node_id).await?;
        // 对一些内容进行解析。
        Ok(Json! {
            "data": training,
        })

    }

    pub async fn get_status(self) -> ResultHandler<String> {
        let node_id = self.node_id.unwrap();
        let mut redis = get_redis_connection();
        let mut store = (&self.basic.db, &mut redis);
        let user_id = if let Some(user) = &self.basic.user_context && user.is_real {
            user.user_id
        } else {
            return Err(HttpError::HandlerError(PermissionDenied));
        };
        let accept_status = Training::status(&mut store, user_id, node_id).await?;
        Ok(Json! {
            "message": "successful",
            "data": accept_status,
        })
    }
}

#[post("/create")]
pub async fn create_training(
    req: HttpRequest,
    db: web::Data<DatabaseConnection>,
    data: web::Json<CreateProps>
) -> ResultHandler<String> {
    Create::new(req, db.as_ref().clone())
        .check_perm()
        .await?
        .run(data.into_inner())
        .await
}

#[get("/view/{user_iden}/{training_iden}")]
pub async fn view_training(
    req: HttpRequest,
    db: web::Data<DatabaseConnection>,
    path: web::Path<(String, String)>
) -> ResultHandler<String> {
    let (user_iden, training_iden) = path.into_inner();
    View::new(req, db.as_ref().clone())
        .load(&user_iden, &training_iden)
        .await?
        .check_perm()
        .await?
        .get()
        .await
}

#[post("/view/{user_iden}/{training_iden}")]
pub async fn post_view_training(
    req: HttpRequest,
    db: web::Data<DatabaseConnection>,
    path: web::Path<(String, String)>
) -> ResultHandler<String> {
    let (user_iden, training_iden) = path.into_inner();
    View::new(req, db.as_ref().clone())
        .load(&user_iden, &training_iden)
        .await?
        .check_perm()
        .await?
        .get()
        .await
}

#[get("/status/{user_iden}/{training_iden}")]
pub async fn get_training_status(
    req: HttpRequest,
    db: web::Data<DatabaseConnection>,
    path: web::Path<(String, String)>
) -> ResultHandler<String> {
    let (user_iden, training_iden) = path.into_inner();
    View::new(req, db.as_ref().clone())
        .load(&user_iden, &training_iden)
        .await?
        .check_perm()
        .await?
        .get_status()
        .await
}

#[derive(Deserialize)]
pub struct AddProblemToListRequest {
    pub list_node_id: i64,
    pub problems: Vec<String>,
}

#[post("/manage/{user_iden}/{training_iden}/add_problem")]
pub async fn add_problem_to_training_list(
    req: HttpRequest,
    db: web::Data<DatabaseConnection>,
    path: web::Path<(String, String)>,
    data: web::Json<AddProblemToListRequest>
) -> ResultHandler<String> {
    let (user_iden, training_iden) = path.into_inner();
    let request = data.into_inner();
    Manage::new(req, db.as_ref().clone())
        .load(&user_iden, &training_iden)
        .await?
        .check_perm(false)
        .await?
        .add_problems(request.list_node_id, request.problems)
        .await
}

#[derive(Deserialize)]
pub struct AddProblemListRequest {
    pub list_node_id: i64,
    pub problem_list: TrainingList,
}

#[post("/manage/{user_iden}/{training_iden}/add_problem_list")]
pub async fn add_problem_list_to_training(
    req: HttpRequest,
    db: web::Data<DatabaseConnection>,
    path: web::Path<(String, String)>,
    data: web::Json<AddProblemListRequest>
) -> ResultHandler<String> {
    let (user_iden, training_iden) = path.into_inner();
    let request = data.into_inner();
    Manage::new(req, db.as_ref().clone())
        .load(&user_iden, &training_iden)
        .await?
        .check_perm(false)
        .await?
        .add_list(request.list_node_id, request.problem_list)
        .await
}

#[derive(Deserialize)]
pub struct ModifyListDescriptionRequest {
    pub list_node_id: i64,
    pub description_public: String,
    pub description_private: String,
}

#[post("/manage/{user_iden}/{training_iden}/modify_description")]
pub async fn modify_training_list_description(
    req: HttpRequest,
    db: web::Data<DatabaseConnection>,
    path: web::Path<(String, String)>,
    data: web::Json<ModifyListDescriptionRequest>
) -> ResultHandler<String> {
    let (user_iden, training_iden) = path.into_inner();
    let request = data.into_inner();
    Manage::new(req, db.as_ref().clone())
        .load(&user_iden, &training_iden)
        .await?
        .check_perm(false)
        .await?
        .modify_desc(request.list_node_id, &request.description_public, &request.description_private)
        .await
}

#[derive(Deserialize)]
pub struct RemoveProblemRequest {
    pub list_node_id: i64,
    pub delete_node_id: i64,
}

#[post("/manage/{user_iden}/{training_iden}/remove_problem")]
pub async fn remove_problem_from_training(
    req: HttpRequest,
    db: web::Data<DatabaseConnection>,
    path: web::Path<(String, String)>,
    data: web::Json<RemoveProblemRequest>
) -> ResultHandler<String> {
    let (user_iden, training_iden) = path.into_inner();
    let request = data.into_inner();
    Manage::new(req, db.as_ref().clone())
        .load(&user_iden, &training_iden)
        .await?
        .check_perm(false)
        .await?
        .rm_problem(request.list_node_id, request.delete_node_id)
        .await
}

#[derive(Deserialize)]
pub struct UpdateOrderRequest {
    pub list_node_id: i64,
    pub orders: Vec<(i64, i64)>,
}

#[post("/manage/{user_iden}/{training_iden}/update_order")]
pub async fn update_training_order(
    req: HttpRequest,
    db: web::Data<DatabaseConnection>,
    path: web::Path<(String, String)>,
    data: web::Json<UpdateOrderRequest>
) -> ResultHandler<String> {
    let (user_iden, training_iden) = path.into_inner();
    let request = data.into_inner();
    Manage::new(req, db.as_ref().clone())
        .load(&user_iden, &training_iden)
        .await?
        .check_perm(false)
        .await?
        .update_order(request.list_node_id, request.orders)
        .await
}

pub fn service() -> Scope {
    let service1 = services![
        create_training,
        view_training,
        post_view_training,
        get_training_status,
        add_problem_to_training_list,
        add_problem_list_to_training,
        modify_training_list_description,
        remove_problem_from_training,
        update_training_order,
    ];
    web::scope("/api/training").service(service1)
}