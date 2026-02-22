use crate::service::save::ManageService;
use redis::TypedCommands;
use serde::{Deserialize, Serialize};
use crate::service::save::Saved;


#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub struct WithIden<T> {
    pub iden: String,
    pub data: T,
}

// 应当考虑通过 event 赋予 iden !

pub trait IdenService {
    fn set_iden(&self, iden: &str);
}

impl<T> IdenService for Saved<T> {
    fn set_iden(&self, iden: &str) {
        let mut redis = crate::utils::get_redis_connection();
        let iden_key = format!("iden:{}", iden);
        redis.set(iden_key, self.id).unwrap();
    }
}

pub async fn get<T>(iden: &str) -> Option<Saved<T>> where
T: for<'de> Deserialize<'de> + Clone + Serialize {
    let mut redis = crate::utils::get_redis_connection();
    let iden_key = format!("iden:{}", iden);
    if let Ok(id) = redis.get(iden_key) {
        Some(Saved::get(id.unwrap().parse::<i64>().unwrap()).await.unwrap())
    } else {
        None
    }
}

pub async fn only_get_id(iden: &str) -> Option<i64> {
    let mut redis = crate::utils::get_redis_connection();
    let iden_key = format!("iden:{}", iden);
    if let Ok(id) = redis.get(iden_key) {
        Some(id.unwrap().parse::<i64>().unwrap())
    } else {
        None
    }
}