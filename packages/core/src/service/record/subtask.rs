use sea_orm::{DatabaseConnection, EntityTrait, QueryFilter};
use crate::action::default::MiscType;
use crate::model::judge::{Subtask, Testcase};
use crate::Result;
use crate::service::save::{IdInfo, ManageService, Saved};
use crate::db::entity::edge::*;

#[derive(Debug, Clone)]
pub enum NextJudge {
    Subtask(Saved<Subtask>),
    Testcase(Saved<Testcase>),
}


pub trait SubtaskAction {
    fn get_next_testcase(&self, db: &DatabaseConnection) -> impl Future<Output = Result<Vec<NextJudge>>>;
}

impl<T: IdInfo> SubtaskAction for T {
    async fn get_next_testcase(&self, db: &DatabaseConnection) -> Result<Vec<NextJudge>> {
        let id = self.get_id();
        let next_subtask_ids = MiscType::Order.get_next_list(db, id).await?;
        let mut res = vec![];
        for item in next_subtask_ids {
            // 先推测是否是subtask。
            let value = Saved::<Subtask>::get(item).await;
            if let Ok(subtask) = value {
                res.push(NextJudge::Subtask(subtask));
            } else {
                let value = Saved::<Testcase>::get(item).await;
                if let Ok(testcase) = value {
                    res.push(NextJudge::Testcase(testcase));
                }
            }
        }
        Ok(res)
    }

}