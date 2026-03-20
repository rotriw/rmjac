use crate::error::CoreError;
use crate::utils::get_redis_connection;
use redis::TypedCommands;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub struct Saved<T> {
    pub id: i64,
    #[serde(flatten)]
    pub data: T,
}

// 为了防止对所有值进行修改，增设此标签，使得数据存储仅存在指定类型。
pub trait Savable {}

pub trait SaveService: Sized {
    fn save(&self) -> impl Future<Output = crate::Result<Saved<Self>>>;
}

impl IdInfo for i64 {
    fn get_id(&self) -> i64 {
        *self
    }
}

pub trait ManageService: Sized {
    type DataType;
    fn get(id: i64) -> impl Future<Output = crate::Result<Self>>;
    fn modify_all(&self, data: Self::DataType) -> impl Future<Output = crate::Result<Self>>;
    fn modify<V: Serialize>(&self, k: &str, v: V) -> impl Future<Output = crate::Result<()>>;
    fn delete(&self, id: i64) -> impl Future<Output = crate::Result<()>>;
}

pub async fn gen_id(redis: &mut redis::Connection) -> crate::Result<i64> {
    let id = redis.incr("global_id", 1)?;
    Ok(id as i64)
}

impl<T: Serialize + Clone + Savable> SaveService for T {
    async fn save(&self) -> crate::Result<Saved<Self>> {
        let id = gen_id(&mut get_redis_connection()).await?;
        let json_data = serde_json::to_string(&self.clone())?;
        crate::env::REDIS_CLIENT
            .lock()
            .unwrap()
            .set(id, json_data)?;
        Ok(Saved {
            id,
            data: self.clone(),
        })
    }
}

impl<T: Serialize + for<'de> Deserialize<'de> + Clone> ManageService for Saved<T> {
    type DataType = T;
    async fn get(id: i64) -> crate::Result<Self> {
        let mut redis = get_redis_connection();
        let json_data = redis.get(id)?;
        if json_data.is_none() {
            Err(CoreError::NotFound(format!("not found id {}", id)))?;
        }
        let json_data = json_data.unwrap();
        let data = serde_json::from_str(&json_data)?;
        Ok(Saved { id, data })
    }

    async fn modify_all(&self, data: T) -> crate::Result<Saved<T>> {
        let json_data = serde_json::to_string(&data)?;
        get_redis_connection().set(self.id, json_data)?;
        Ok(Saved { id: self.id, data })
    }

    async fn modify<V: Serialize>(&self, k: &str, v: V) -> crate::Result<()> {
        let mut data_map: serde_json::Value = serde_json::to_value(&self.data)?;
        if let Some(obj) = data_map.as_object_mut() {
            obj.insert(k.to_string(), serde_json::to_value(v)?);
            let json_data = serde_json::to_string(&data_map)?;
            get_redis_connection().set(self.id, json_data)?;
            Ok(())
        } else {
            Err(crate::error::CoreError::StringError(
                "Data is not a JSON object".to_string(),
            ))
        }
    }

    async fn delete(&self, id: i64) -> crate::Result<()> {
        get_redis_connection().del(id)?;
        Ok(())
    }
}

pub trait IdInfo {
    fn get_id(&self) -> i64;
}

impl<T> IdInfo for Saved<T> {
    fn get_id(&self) -> i64 {
        self.id
    }
}

pub mod default;
pub mod temp;

impl<T: Clone> Saved<T> {
    pub fn map<E: From<T>>(&self) -> Saved<E> {
        Saved {
            id: self.id,
            data: self.data.clone().into(),
        }
    }
}

/// 批量从 Redis 获取多个 id 的数据（使用 pipeline 减少 RTT）
/// 返回结果与输入 ids 顺序一致，找不到的 id 跳过
pub async fn batch_get_raw(ids: &[i64]) -> crate::Result<Vec<(i64, String)>> {
    if ids.is_empty() {
        return Ok(vec![]);
    }
    let mut redis = get_redis_connection();
    let mut pipe = redis::pipe();
    for &id in ids {
        pipe.cmd("GET").arg(id);
    }
    let results: Vec<Option<String>> = pipe.query(&mut *redis)?;
    let mut out = Vec::with_capacity(ids.len());
    for (i, json_opt) in results.into_iter().enumerate() {
        if let Some(json) = json_opt {
            out.push((ids[i], json));
        }
    }
    Ok(out)
}
