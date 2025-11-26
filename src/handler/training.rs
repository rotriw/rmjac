use actix_web::{HttpMessage, HttpRequest};
use chrono::NaiveDateTime;
use enum_const::EnumConst;
use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};
use rmjac_core::graph::edge::perm_pages::{PagesPerm, PermPagesEdgeQuery};
use rmjac_core::graph::edge::perm_system::{PermSystemEdgeQuery, SystemPerm};
use rmjac_core::model::perm::check_perm;
use rmjac_core::model::problem::CreateProblemProps;
use crate::handler::{BasicHandler, HttpError, ResultHandler};
use rmjac_core::model::training::{add_problem_into_training_list, add_problem_into_training_list_from_problem_iden, check_problem_list_in_training, create_training_problem_node, create_training_problem_node_for_list, get_training_node_id_by_iden, modify_training_description, TrainingList};
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
            && user.is_real
            && check_perm(&self.basic.db, user.user_id, system_id, PermSystemEdgeQuery, SystemPerm::CreateTraining.get_const_isize().unwrap() as i64).await? == 1 {
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
            if require_sudo == false && check_perm(&self.basic.db, user.user_id, node_id, PermPagesEdgeQuery, PagesPerm::EditPages.get_const_isize().unwrap() as i64).await? == 1 {
                return Ok(self);
            }

            if check_perm(&self.basic.db, user.user_id, node_id, PermSystemEdgeQuery, PagesPerm::DeletePages.get_const_isize().unwrap() as i64).await? == 1 {
                return Ok(self);
            }

            if check_perm(&self.basic.db, user.user_id, node_id, PermSystemEdgeQuery, SystemPerm::ManageAllTraining.get_const_isize().unwrap() as i64).await? == 1 {
                return Ok(self);
            }
        }
        Err(HttpError::HandlerError(PermissionDenied))
    }

    pub async fn add_problem_into_list(self, list_node_id: i64, problem: Vec<String>) -> ResultHandler<String> {
        let node_id = self.node_id.unwrap();
        // check problem_list is in node
        if (check_problem_list_in_training(&self.basic.db, node_id, list_node_id).await? == false) {
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

    pub async fn add_problem_list_into_list(self, list_node_id: i64, new_problem_list: TrainingList) -> ResultHandler<String> {
        let node_id = self.node_id.unwrap();
        // check problem_list is in node
        if (check_problem_list_in_training(&self.basic.db, node_id, list_node_id).await? == false) {
            return Ok(Json! {
                "status": "error",
                "message": "problem list not in training",
            });
        }
        let mut redis = &mut get_redis_connection();
        let new_node = create_training_problem_node_for_list(&self.basic.db, &mut redis, &new_problem_list, list_node_id).await?;
        Ok(Json! {
            "message": "successful",
            "successful_data": new_node,
        })
    }

    pub async fn modify_list_description(self, list_node_id: i64, new_description_public: &str, new_description_private: &str) -> ResultHandler<String> {
        let node_id = self.node_id.unwrap();
        // check problem_list is in node
        if (check_problem_list_in_training(&self.basic.db, node_id, list_node_id).await? == false) {
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
            if check_perm(&self.basic.db, user.user_id, node_id, PermPagesEdgeQuery, PagesPerm::ReadPages.get_const_isize().unwrap() as i64).await? == 1 {
                return Ok(self);
            }
            if check_perm(&self.basic.db, user.user_id, node_id, PermSystemEdgeQuery, SystemPerm::ManageAllTraining.get_const_isize().unwrap() as i64).await? == 1 {
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