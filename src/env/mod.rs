use std::str::FromStr;
use std::sync::Mutex;

use lazy_static::lazy_static;
use serde::Deserialize;
use serde_json::Value;

#[derive(Debug, Deserialize)]
pub struct Config {
    pub secret_challenge_code: String,
    pub secret_edge_pwd: String,
    pub redis_url: Option<String>,
    pub postgres_url: Option<String>,
}

lazy_static! {
    pub static ref CONFIG: Mutex<Config> = Mutex::new(Config {
        secret_challenge_code: "default_secret".to_string(),
        postgres_url: Some("postgresql://localhost:5432".to_string()),
        redis_url: Some("redis://localhost:6379".to_string()),
        secret_edge_pwd: "default_edge_pwd".to_string(),
    });
}

pub fn get_value(c: &Value, key: &str, default_value: &str) -> String {
    let d = c.get(key);
    if d.is_none() {
        return default_value.to_string();
    }
    let de = d.unwrap();
    if let Value::String(v) = de {
        v.clone()
    } else {
        default_value.to_string()
    }
}

pub fn env_load(path: &str) -> Result<(), String> {
    let path = shellexpand::tilde(path).to_string();
    let config =
        std::fs::read_to_string(&path).map_err(|e| format!("Failed to read config file: {e}"))?;
    log::info!("Loading config from: {}", &path);
    let config = serde_json::Value::from_str(&config).map_err(|e| format!("Failed to parse config file: {e}"))?;
    let mut env = CONFIG.lock().unwrap();
    env.secret_challenge_code = get_value(&config, "secret_challenge_code", "123456");
    env.postgres_url = Some(get_value(&config, "postgres_url", "postgresql://localhost:5432"));
    env.redis_url = Some(get_value(&config, "redis_url", "redis://localhost:6379"));
    env.secret_edge_pwd = get_value(&config, "secret_edge_pwd", "default_edge_pwd");
    *rmjac_core::env::RESEND_KEY.lock().unwrap() = get_value(&config, "resend_email", "").to_string();
    Ok(())
}
