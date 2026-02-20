use redis::TypedCommands;
use crate::env::DefaultNodes;
use crate::utils::get_redis_connection;

pub fn get_key(k: &str) -> i64 {
    let mut redis = get_redis_connection();
    redis.get(k).unwrap().unwrap().parse().unwrap()
}

pub async fn get_default_node() -> DefaultNodes {
    DefaultNodes {
        guest_user_node: get_key("default_guest_id"),
        default_strategy_node: get_key("default_strategy_id"),
        default_system_node: get_key("default_system_id"),
        default_iden_node: get_key("default_iden_id"),
    }
}