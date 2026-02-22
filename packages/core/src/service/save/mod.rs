use redis::TypedCommands;
use serde::{Deserialize, Serialize};
use crate::error::CoreError;
use crate::utils::get_redis_connection;

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
    async fn save(&self) -> crate::Result<Saved<Self>>;
}

impl IdInfo for i64 {
    fn get_id(&self) -> i64 {
        *self
    }
}

pub trait ManageService: Sized {
    type DataType;
    async fn get(id: i64) -> crate::Result<Self>;
    async fn modify_all(&self, data: Self::DataType) -> crate::Result<Self>;
    async fn modify<V: Serialize>(&self, k: &str, v: V) -> crate::Result<()>;
    async fn delete(&self, id: i64) -> crate::Result<()>;
}

pub async fn gen_id(redis: &mut redis::Connection) -> crate::Result<i64> {
    let id = redis.incr("global_id", 1)?;
    Ok(id as i64)
}

impl<T: Serialize + Clone + Savable> SaveService for T {
    async fn save(&self) -> crate::Result<Saved<Self>> {
        let id = gen_id(&mut get_redis_connection()).await?;
        let json_data = serde_json::to_string(&self.clone())?;
        crate::env::REDIS_CLIENT.lock().unwrap().set(id, json_data)?;
        Ok(Saved { id, data: self.clone() })
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
            Err(crate::error::CoreError::StringError("Data is not a JSON object".to_string()))
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

pub mod temp;
pub mod default;