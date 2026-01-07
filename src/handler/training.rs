use actix_web::{HttpMessage, Scope, web};
use chrono::NaiveDateTime;
use enum_const::EnumConst;
use redis::TypedCommands;
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
use macro_handler::{generate_handler, handler, from_path, export, perm, route};

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

#[derive(Deserialize)]
pub struct AddProblemToListRequest {
    pub list_node_id: i64,
    pub problems: Vec<String>,
}

#[derive(Deserialize)]
pub struct AddProblemListRequest {
    pub list_node_id: i64,
    pub problem_list: TrainingList,
}

#[derive(Deserialize)]
pub struct ModifyListDescriptionRequest {
    pub list_node_id: i64,
    pub description_public: String,
    pub description_private: String,
}

#[derive(Deserialize)]
pub struct RemoveProblemRequest {
    pub list_node_id: i64,
    pub delete_node_id: i64,
}

#[derive(Deserialize)]
pub struct UpdateOrderRequest {
    pub list_node_id: i64,
    pub orders: Vec<(i64, i64)>,
}

// Create Handler - 创建训练
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
            if let Some(uc) = &self.basic.user_context && uc.is_real {
                true
            } else {
                false
            }
        }

        #[handler]
        #[route("/normal")]
        async fn post_create(&self, data: CreateProps) -> ResultHandler<String> {
            let mut redis = get_redis_connection();
            let mut store = (&self.basic.db, &mut redis);
            let user_id = self.basic.user_context.as_ref().unwrap().user_id;
            let training_data = Training::create_as(
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
                "data": training_data,
            })
        }
    }
}

// View Handler - 查看训练
#[generate_handler]
mod view {
    use super::*;

    #[handler("/view")]
    pub struct View {
        basic: BasicHandler,
    }

    impl View {
        #[from_path(user_iden, training_iden)]
        #[export(node_id)]
        async fn before_resolve(&self, user_iden: &str, training_iden: &str) -> ResultHandler<i64> {
            let mut redis = get_redis_connection();
            let mut store = (&self.basic.db, &mut redis);
            let node_id = Training::node_id(&mut store, user_iden, training_iden).await?;
            Ok(node_id)
        }

        #[perm]
        async fn check_view_perm(&self, node_id: i64) -> bool {
            if let Some(user) = &self.basic.user_context && user.is_real {
                if check_pages_perm(user.user_id, node_id, PagesPerm::ReadPages.get_const_isize().unwrap() as i64) == 1 {
                    return true;
                }
                if check_system_perm(user.user_id, node_id, SystemPerm::ManageAllTraining.get_const_isize().unwrap() as i64) == 1 {
                    return true;
                }
            }
            false
        }

        #[handler]
        #[route("/{user_iden}/{training_iden}")]
        async fn get_view(&self, node_id: i64) -> ResultHandler<String> {
            let mut redis = get_redis_connection();
            let mut store = (&self.basic.db, &mut redis);
            let training = Training::get(&mut store, node_id).await?;
            Ok(Json! {
                "data": training,
            })
        }

        #[handler]
        #[route("/{user_iden}/{training_iden}")]
        async fn post_view(&self, node_id: i64) -> ResultHandler<String> {
            let mut redis = get_redis_connection();
            let mut store = (&self.basic.db, &mut redis);
            let training = Training::get(&mut store, node_id).await?;
            Ok(Json! {
                "data": training,
            })
        }
    }
}

// Status Handler - 获取训练状态
#[generate_handler]
mod status {
    use super::*;

    #[handler("/status")]
    pub struct Status {
        basic: BasicHandler,
    }

    impl Status {
        #[from_path(user_iden, training_iden)]
        #[export(node_id)]
        async fn before_resolve(&self, user_iden: &str, training_iden: &str) -> ResultHandler<i64> {
            let mut redis = get_redis_connection();
            let mut store = (&self.basic.db, &mut redis);
            let node_id = Training::node_id(&mut store, user_iden, training_iden).await?;
            Ok(node_id)
        }

        #[perm]
        async fn check_status_perm(&self, node_id: i64) -> bool {
            if let Some(user) = &self.basic.user_context && user.is_real {
                if check_pages_perm(user.user_id, node_id, PagesPerm::ReadPages.get_const_isize().unwrap() as i64) == 1 {
                    return true;
                }
                if check_system_perm(user.user_id, node_id, SystemPerm::ManageAllTraining.get_const_isize().unwrap() as i64) == 1 {
                    return true;
                }
            }
            false
        }

        #[handler]
        #[route("/{user_iden}/{training_iden}")]
        async fn get_status(&self, node_id: i64) -> ResultHandler<String> {
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
}

// Manage Handler - 管理训练
#[generate_handler]
mod manage {
    use super::*;

    #[handler("/manage")]
    pub struct Manage {
        basic: BasicHandler,
    }

    impl Manage {
        #[from_path(user_iden, training_iden)]
        #[export(node_id)]
        async fn before_resolve(&self, user_iden: &str, training_iden: &str) -> ResultHandler<i64> {
            let mut redis = get_redis_connection();
            let mut store = (&self.basic.db, &mut redis);
            let node_id = Training::node_id(&mut store, user_iden, training_iden).await?;
            Ok(node_id)
        }

        #[perm]
        async fn check_manage_perm(&self, node_id: i64) -> bool {
            if let Some(user) = &self.basic.user_context && user.is_real {
                if check_pages_perm(user.user_id, node_id, PagesPerm::EditPages.get_const_isize().unwrap() as i64) == 1 {
                    return true;
                }
                if check_system_perm(user.user_id, node_id, PagesPerm::DeletePages.get_const_isize().unwrap() as i64) == 1 {
                    return true;
                }
                if check_system_perm(user.user_id, node_id, SystemPerm::ManageAllTraining.get_const_isize().unwrap() as i64) == 1 {
                    return true;
                }
            }
            false
        }

        #[handler]
        #[route("/{user_iden}/{training_iden}/add_problem")]
        async fn post_add_problem(&self, node_id: i64, data: AddProblemToListRequest) -> ResultHandler<String> {
            let mut redis = get_redis_connection();
            let mut store = (&self.basic.db, &mut redis);
            let p_id = Training::root_id(&mut store, node_id).await?;
            
            if !Training::has_list(&mut store, p_id, data.list_node_id).await? {
                return Ok(Json! {
                    "status": "error",
                    "message": "problem list not in training",
                });
            }
            
            let mut result = vec![];
            for p in &data.problems {
                let feedback = Training::add_by_iden(&mut store, data.list_node_id, p).await;
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

        #[handler]
        #[route("/{user_iden}/{training_iden}/add_problem_list")]
        async fn post_add_problem_list(&self, node_id: i64, data: AddProblemListRequest) -> ResultHandler<String> {
            let mut redis = get_redis_connection();
            let mut store = (&self.basic.db, &mut redis);
            let p_id = Training::root_id(&mut store, node_id).await?;
            
            if !Training::has_list(&mut store, p_id, data.list_node_id).await? {
                return Ok(Json! {
                    "status": "error",
                    "message": "problem list not in training",
                });
            }
            
            let new_node = Training::build_list(&mut store, &data.problem_list, data.list_node_id).await?;
            Ok(Json! {
                "message": "successful",
                "successful_data": new_node,
            })
        }

        #[handler]
        #[route("/{user_iden}/{training_iden}/modify_description")]
        async fn post_modify_desc(&self, node_id: i64, data: ModifyListDescriptionRequest) -> ResultHandler<String> {
            let mut redis = get_redis_connection();
            let mut store = (&self.basic.db, &mut redis);
            let p_id = Training::root_id(&mut store, node_id).await?;
            
            if !Training::has_list(&mut store, p_id, data.list_node_id).await? {
                return Ok(Json! {
                    "status": "error",
                    "message": "problem list not in training",
                });
            }
            
            Training::set_desc(&mut store, data.list_node_id, &data.description_public, &data.description_private).await?;
            Ok(Json! {
                "message": "successful",
            })
        }

        #[handler]
        #[route("/{user_iden}/{training_iden}/remove_problem")]
        async fn post_remove_problem(&self, node_id: i64, data: RemoveProblemRequest) -> ResultHandler<String> {
            let mut redis = get_redis_connection();
            let edge = TrainingProblemEdge::from_db(&self.basic.db, data.delete_node_id).await?;
            if edge.u != data.list_node_id {
                return Ok(Json! {
                    "status": "error",
                    "message": "mismatched list node id and edge",
                });
            }
            edge.delete(&self.basic.db).await?;
            let _ = redis.del::<_>(format!("training_{node_id}"));
            Ok(Json! {
                "message": "successful",
            })
        }

        #[handler]
        #[route("/{user_iden}/{training_iden}/update_order")]
        async fn post_update_order(&self, node_id: i64, data: UpdateOrderRequest) -> ResultHandler<String> {
            let mut redis = get_redis_connection();
            let mut store = (&self.basic.db, &mut redis);
            let p_id = Training::root_id(&mut store, node_id).await?;
            
            if !Training::has_list(&mut store, p_id, data.list_node_id).await? {
                return Ok(Json! {
                    "status": "error",
                    "message": "problem list not in training",
                });
            }
            
            Training::set_order(&mut store, data.list_node_id, data.orders).await?;
            Ok(Json! {
                "message": "successful",
            })
        }
    }
}

pub fn service() -> Scope {
    web::scope("/api/training")
        .service(create::Create::export_http_service())
        .service(view::View::export_http_service())
        .service(status::Status::export_http_service())
        .service(manage::Manage::export_http_service())
}
