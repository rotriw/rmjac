use actix_web::{HttpMessage, HttpRequest, Scope, get, post, services, web};
use chrono::NaiveDateTime;
use enum_const::EnumConst;
use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};
use rmjac_core::graph::edge::perm_pages::PagesPerm;
use rmjac_core::graph::edge::perm_system::SystemPerm;
use rmjac_core::model::perm::{check_pages_perm, check_system_perm};
use crate::handler::{BasicHandler, HttpError, ResultHandler};
use rmjac_core::model::training::{add_problem_into_training_list_from_problem_iden, check_problem_list_in_training, create_training_problem_node_for_list, get_training_node_id_by_iden, get_training_problem_id, get_training_problem_list, modify_training_description, remove_problem_from_training_list, update_training_problem_order, TrainingList};
use rmjac_core::utils::get_redis_connection;
use crate::handler::HandlerError::PermissionDenied;
use crate::utils::perm::UserAuthCotext;

pub struct Create {
    basic: BasicHandler,
}

#[derive(Deserialize, Serialize, Clone, Debug)]
pub struct CreateTrainingProps {
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
    pub fn entry(req: HttpRequest, db: DatabaseConnection) -> Self {
        Self {
            basic: BasicHandler {
                db,
                req: req.clone(),
                user_context: req.extensions().get::<UserAuthCotext>().cloned()
            }
        }
    }

    pub async fn perm(self) -> ResultHandler<Self> {
        let user = &self.basic.user_context;
        let system_id = rmjac_core::env::DEFAULT_NODES.lock().unwrap().default_system_node;
        if let Some(user) = user
            && user.is_real{
            Ok(self)
        } else {
            Err(HttpError::HandlerError(PermissionDenied))
        }
    }

    pub async fn exec(self, data: CreateTrainingProps) -> ResultHandler<String> {
        let mut redis = get_redis_connection();
        let user_id = self.basic.user_context.unwrap().user_id;
        let data = rmjac_core::model::training::create_training_with_user(&self.basic.db, &mut redis, &data.title, &user_id.to_string(), &data.iden, &data.description_public, &data.description_private, data.start_time, data.end_time, &data.training_type, &data.problem_list, data.write_perm_user, data.read_perm_user, user_id).await?;
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
    pub fn entry(req: HttpRequest, db: DatabaseConnection) -> Self {
        Self {
            basic: BasicHandler {
                db,
                req: req.clone(),
                user_context: req.extensions().get::<UserAuthCotext>().cloned()
            },
            node_id: None,
        }
    }

    pub async fn before(self, user_iden: &str, problem_iden: &str) -> ResultHandler<Self> {
        let mut redis = get_redis_connection();
        let node_id = get_training_node_id_by_iden(&self.basic.db, &mut redis, user_iden, problem_iden).await?;
        Ok(Self {
            node_id: Some(node_id),
            ..self
        })
    }

    pub async fn perm(self, require_sudo: bool) -> ResultHandler<Self> {
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

    pub async fn add_problem_into_list(self, list_node_id: i64, problem: Vec<String>) -> ResultHandler<String> {
        let node_id = self.node_id.unwrap();
        let mut redis = get_redis_connection();
        let p_id = get_training_problem_id(&self.basic.db, &mut redis, node_id).await?;
        // check problem_list is in node
        if check_problem_list_in_training(&self.basic.db, p_id, list_node_id).await? == false {
            return Ok(Json! {
                "status": "error",
                "message": "problem list not in training",
            });
        }
        let mut redis = &mut get_redis_connection();
        let mut result = vec![];
        for p in &problem {
            let feedback = add_problem_into_training_list_from_problem_iden(&self.basic.db, &mut redis, node_id, p).await;
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

    pub async fn add_new_problem_list_into_list(self, list_node_id: i64, new_problem_list: TrainingList) -> ResultHandler<String> {
        let node_id = self.node_id.unwrap();
        let mut redis = get_redis_connection();
        let p_id = get_training_problem_id(&self.basic.db, &mut redis, node_id).await?;
        // check problem_list is in node
        if check_problem_list_in_training(&self.basic.db, p_id, list_node_id).await? == false && p_id != list_node_id {
            return Ok(Json! {
                "status": "error",
                "message": "problem list not in training",
            });
        }
        let new_node = create_training_problem_node_for_list(&self.basic.db, &mut redis, &new_problem_list, list_node_id).await?;
        Ok(Json! {
            "message": "successful",
            "successful_data": new_node,
        })
    }

    pub async fn modify_list_description(self, list_node_id: i64, new_description_public: &str, new_description_private: &str) -> ResultHandler<String> {
        let node_id = self.node_id.unwrap();
        let mut redis = get_redis_connection();
        let p_id = get_training_problem_id(&self.basic.db, &mut redis, node_id).await?;
        // check problem_list is in node
        if check_problem_list_in_training(&self.basic.db, p_id, list_node_id).await? == false {
            return Ok(Json! {
                "status": "error",
                "message": "problem list not in training",
            });
        }
        modify_training_description(&self.basic.db, list_node_id, new_description_public, new_description_private).await?;
        Ok(Json! {
            "message": "successful",
        })
    }

    pub async fn remove_problem(self, list_node_id: i64, delete_node_id: i64) -> ResultHandler<String> {
        let node_id = self.node_id.unwrap();
        if check_problem_list_in_training(&self.basic.db, node_id, list_node_id).await? == false {
            return Ok(Json! {
                "status": "error",
                "message": "problem list not in training",
            });
        }
        let mut redis = &mut get_redis_connection();
        remove_problem_from_training_list(&self.basic.db, &mut redis, list_node_id, delete_node_id).await?;
        Ok(Json! {
            "message": "successful",
        })
    }

    pub async fn update_order(self, list_node_id: i64, orders: Vec<(i64, i64)>) -> ResultHandler<String> {
        let node_id = self.node_id.unwrap();
        if check_problem_list_in_training(&self.basic.db, node_id, list_node_id).await? == false {
            return Ok(Json! {
                "status": "error",
                "message": "problem list not in training",
            });
        }
        let mut redis = &mut get_redis_connection();
        update_training_problem_order(&self.basic.db, &mut redis, list_node_id, orders).await?;
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
    pub fn entry(req: HttpRequest, db: DatabaseConnection) -> Self {
        Self {
            basic: BasicHandler {
                db,
                req: req.clone(),
                user_context: req.extensions().get::<UserAuthCotext>().cloned()
            },
            node_id: None,
        }
    }

    pub async fn before(self, user_iden: &str, problem_iden: &str) -> ResultHandler<Self> {
        let mut redis = get_redis_connection();
        let node_id = get_training_node_id_by_iden(&self.basic.db, &mut redis, user_iden, problem_iden).await?;
        Ok(Self {
            node_id: Some(node_id),
            ..self
        })
    }

    pub async fn perm(self) -> ResultHandler<Self> {
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

    pub async fn view_problem(self) -> ResultHandler<String> {
        let node_id = self.node_id.unwrap();
        let mut redis = &mut get_redis_connection();
        let training_data = rmjac_core::model::training::get_training(&self.basic.db, &mut redis, node_id).await?;
        Ok(Json! {
            "data": training_data,
        })
    }

    pub async fn get_problem_accept_status(self) -> ResultHandler<String> {
        let node_id = self.node_id.unwrap();
        let mut redis = &mut get_redis_connection();
        let user_id = if let Some(user) = &self.basic.user_context && user.is_real {
            user.user_id
        } else {
            return Err(HttpError::HandlerError(PermissionDenied));
        };
        let accept_status = rmjac_core::model::training::get_user_training_status(&self.basic.db, &mut redis, user_id, node_id).await?;
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
    data: web::Json<CreateTrainingProps>
) -> ResultHandler<String> {
    Create::entry(req, db.as_ref().clone())
        .perm()
        .await?
        .exec(data.into_inner())
        .await
}

#[get("/view/{user_iden}/{training_iden}")]
pub async fn view_training(
    req: HttpRequest,
    db: web::Data<DatabaseConnection>,
    path: web::Path<(String, String)>
) -> ResultHandler<String> {
    let (user_iden, training_iden) = path.into_inner();
    View::entry(req, db.as_ref().clone())
        .before(&user_iden, &training_iden)
        .await?
        .perm()
        .await?
        .view_problem()
        .await
}

#[post("/view/{user_iden}/{training_iden}")]
pub async fn post_view_training(
    req: HttpRequest,
    db: web::Data<DatabaseConnection>,
    path: web::Path<(String, String)>
) -> ResultHandler<String> {
    let (user_iden, training_iden) = path.into_inner();
    View::entry(req, db.as_ref().clone())
        .before(&user_iden, &training_iden)
        .await?
        .perm()
        .await?
        .view_problem()
        .await
}

#[get("/status/{user_iden}/{training_iden}")]
pub async fn get_training_status(
    req: HttpRequest,
    db: web::Data<DatabaseConnection>,
    path: web::Path<(String, String)>
) -> ResultHandler<String> {
    let (user_iden, training_iden) = path.into_inner();
    View::entry(req, db.as_ref().clone())
        .before(&user_iden, &training_iden)
        .await?
        .perm()
        .await?
        .get_problem_accept_status()
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
    Manage::entry(req, db.as_ref().clone())
        .before(&user_iden, &training_iden)
        .await?
        .perm(false)
        .await?
        .add_problem_into_list(request.list_node_id, request.problems)
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
    Manage::entry(req, db.as_ref().clone())
        .before(&user_iden, &training_iden)
        .await?
        .perm(false)
        .await?
        .add_new_problem_list_into_list(request.list_node_id, request.problem_list)
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
    Manage::entry(req, db.as_ref().clone())
        .before(&user_iden, &training_iden)
        .await?
        .perm(false)
        .await?
        .modify_list_description(request.list_node_id, &request.description_public, &request.description_private)
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
    Manage::entry(req, db.as_ref().clone())
        .before(&user_iden, &training_iden)
        .await?
        .perm(false)
        .await?
        .remove_problem(request.list_node_id, request.delete_node_id)
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
    Manage::entry(req, db.as_ref().clone())
        .before(&user_iden, &training_iden)
        .await?
        .perm(false)
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