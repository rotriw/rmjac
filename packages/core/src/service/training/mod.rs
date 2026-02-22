use std::cmp::max;
use std::collections::HashMap;
use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};
use crate::action::default::MiscType;
use crate::model::content::Description;
use crate::model::problem::Problem;
use crate::model::training::{Training, TrainingItem, TrainingItemContent};
use crate::Result;
use crate::service::problem::BasicProblemInfo;
use crate::service::save::{ManageService, SaveService, Saved};

pub trait TrainingItemTrait {
    fn get_content(&self) -> TrainingItemContent;
    fn get_description(&self) -> Description;
}

impl TrainingItemTrait for Saved<TrainingItem> {
    fn get_content(&self) -> TrainingItemContent {
        self.data.content.clone()
    }

    fn get_description(&self) -> Description {
        self.data.description.clone()
    }
}

impl TrainingItemTrait for Saved<Problem> {
    fn get_content(&self) -> TrainingItemContent {
        TrainingItemContent::Problem(self.id)
    }
    fn get_description(&self) -> Description {
        self.data.description.clone()
    }
}

pub trait TrainingManage {
    fn add_training_item<T: TrainingItemTrait>(&self, db: &DatabaseConnection, sign: &str, problem: &T) -> impl Future<Output = Result<Saved<TrainingItem>>>;
    fn reorder_item(&self, db: &DatabaseConnection, new_order: Vec<String>) -> impl Future<Output = Result<()>>; // new_order with uuid.
    fn delete_item(&self, db: &DatabaseConnection, remove_items: Vec<String>) -> impl Future<Output = Result<()>>;
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Order {
    order: i64
}

impl<F> TrainingManage for Saved<F> {
    async fn add_training_item<T: TrainingItemTrait>(&self, db: &DatabaseConnection, sign: &str, item: &T) -> Result<Saved<TrainingItem>> {
        let now_list = MiscType::Order.get_next_list(db, self.id).await?;
        let mut now_max = -1i64;
        for item in now_list {
            now_max = max(now_max, Saved::<Order>::get(item).await?.data.order);
        }
        let item = TrainingItem {
            uuid: uuid::Uuid::new_v4().to_string(),
            order: now_max + 1,
            sign: sign.to_string(),
            content: item.get_content(),
            description: item.get_description(),
        };
        let item_saved = item.save().await?;
        Ok(item_saved)
    }

    async fn reorder_item(&self, db: &DatabaseConnection, new_order: Vec<String>) -> Result<()> {
        let mut order_list = HashMap::new();
        for (order, item) in new_order.iter().enumerate() {
            order_list.insert(item, order);
        }

        #[derive(Debug, Clone, Serialize, Deserialize)]
        struct UUidWithOrder {
            uuid: String,
            order: i64,
        }
        let now_list = MiscType::Order.get_next_list(db, self.id).await?;
        for item in now_list {
            let mut item = Saved::<UUidWithOrder>::get(item).await?;
            if let Some(new_order) = order_list.get(&item.data.uuid) {
                item.data.order = *new_order as i64;
                item.modify("order", new_order).await?;
            }
        }
        Ok(())
    }

    async fn delete_item(&self, db: &DatabaseConnection, remove_items: Vec<String>) -> Result<()> {
        let exist_list = MiscType::Order.get_next_list(db, self.id).await?;
        let mut remove = vec![];
        #[derive(Debug, Clone, Serialize, Deserialize)]
        struct UUid {
            uuid: String,
        }
        for item in exist_list {
            let value = Saved::<UUid>::get(item).await?;
            if remove_items.contains(&value.data.uuid) {
                remove.push(item);
            }
        }
        MiscType::Order.remove_with_fn(db, self.id, |_from, to| {
            remove.contains(&to)
        }).await?;
        Ok(())
    }
}