use std::sync::Mutex;

use lazy_static::lazy_static;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct Config {
    pub secret_challenge_code: String,
    pub postgres_url: Option<String>,
}

lazy_static! {
    pub static ref CONFIG: Mutex<Config> = Mutex::new(Config {
        secret_challenge_code: "default_secret".to_string(),
        postgres_url: Some("postgresql://localhost:5432".to_string()),
    });
}

pub fn env_load(path: &str) -> Result<(), String> {
    let path = shellexpand::tilde(path).to_string();
    let config =
        std::fs::read_to_string(path).map_err(|e| format!("Failed to read config file: {}", e))?;
    let config: Result<Config, serde_json::Error> = serde_json::from_str(&config);
    match config {
        Ok(cfg) => {
            let mut env = CONFIG.lock().unwrap();
            env.secret_challenge_code = cfg.secret_challenge_code;
            Ok(())
        }
        Err(e) => Err(format!("Failed to parse config file: {}", e)),
    }
}
