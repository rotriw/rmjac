use mongodb::{bson::doc, Client, Collection};
use serde::{Deserialize, Serialize};

use crate::{env, error::CoreError};

#[derive(Serialize, Deserialize, Debug)]
struct Counter {
    iden: String,
    value: u64,
}

pub async fn gen_counter(client: &Client, db_name: &str, iden: &str) -> Result<u64, CoreError> {
    let db = client.database(db_name);
    let collection: Collection<Counter> = db.collection("counter");
    let filter = doc! { "iden": iden };
    let update = doc! { "$inc": { "value": 1 } };
    let result = collection
        .find_one_and_update(filter, update)
        .await
        .map_err(|e| CoreError::MongoError(e.to_string()))?;
    if let Some(counter) = result {
        Ok(counter.value)
    } else {
        let new_counter = Counter {
            iden: iden.to_string(),
            value: 1,
        };
        collection
            .insert_one(new_counter)
            .await
            .map_err(|e| CoreError::MongoError(e.to_string()))?;
        Ok(1)
    }
}
