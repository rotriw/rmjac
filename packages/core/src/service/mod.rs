use crate::env;

pub fn service_start(postgresql: Option<String>) {
    *env::POSTGRESQL.lock().unwrap() = postgresql
        .map(|s| s.to_string())
        .unwrap_or_else(|| "postgres://localhost/rmjac".to_string());
}
