use crate::handler::ResultHandler;
use macro_handler::{generate_handler, handler, perm, route};
use rmjac_core::env;
use rmjac_core::workflow::vjudge::VjudgeWorkflowRegistry;
use crate::utils::perm::UserAuthCotext;
use rmjac_core::model::ModelStore;
use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct AvailableService {
    pub platform: String,
    pub operation: String,
    pub method: Option<String>,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ServiceRegistryResponse {
    pub services: Vec<AvailableService>,
    pub platforms: Vec<serde_json::Value>,
}

#[generate_handler(route = "/services", real_path = "/api/vjudge/services")]
pub mod handler {
    use macro_handler::export;
    use rmjac_core::workflow::vjudge::workflow::get_require;
    use rmjac_core::workflow::vjudge::system::WorkflowRequire;
    use super::*;
    
    #[handler]
    #[perm(check_perm)]
    #[route("/get_require")]
    #[export("data")]
    async fn post_service_require(service_name: &str) -> ResultHandler<Vec<WorkflowRequire>> {
        Ok(get_require(service_name).await)
    }
}
