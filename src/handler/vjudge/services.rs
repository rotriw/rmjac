use crate::handler::ResultHandler;
use macro_handler::{generate_handler, handler, perm, route};
use rmjac_core::env;
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
    use super::*;

    #[perm]
    async fn check_perm() -> bool {
        true
    }

    #[handler]
    #[perm(check_perm)]
    #[route("/get")]
    #[export("data")]
    async fn get_services() -> ResultHandler<ServiceRegistryResponse> {
        let registry = env::EDGE_SERVICE_INDEX.lock().unwrap();
        let mut services = Vec::new();
        for key in registry.keys() {
            let mut parts = key.splitn(3, ':');
            let platform = parts.next().unwrap_or("").to_string();
            let operation = parts.next().unwrap_or("").to_string();
            let method = parts.next().unwrap_or("").to_string();
            if platform.is_empty() || operation.is_empty() {
                continue;
            }
            services.push(AvailableService {
                platform,
                operation,
                method: if method.is_empty() { None } else { Some(method) },
            });
        }
        let platforms = env::EDGE_PLATFORM_INFO
            .lock()
            .unwrap()
            .values()
            .cloned()
            .collect::<Vec<_>>();
        Ok(ServiceRegistryResponse { services, platforms })
    }
}
