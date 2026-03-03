use std::ops::Sub;
use async_recursion::async_recursion;
use sea_orm::{DatabaseConnection, EntityTrait, QueryFilter};
use uuid::uuid;
use crate::action::default::MiscType;
use crate::model::judge::{JudgeLimit, RootSubtask, Subtask, SubtaskDetail, Testcase};
use crate::Result;
use crate::service::save::{IdInfo, ManageService, SaveService, Saved};
use crate::db::entity::edge::*;
use crate::error::CoreError;
use crate::error::CoreError::NoRelatedSubtask;

#[derive(Debug, Clone)]
pub enum NextJudge {
    Subtask(Saved<Subtask>),
    Testcase(Saved<Testcase>),
}


pub trait SubtaskAction {
    fn get_next_testcase(&self, db: &DatabaseConnection) -> impl Future<Output = Result<Vec<NextJudge>>>;
    fn get_all_testcase(&self, db: &DatabaseConnection) -> impl Future<Output = Result<Vec<Saved<Testcase>>>>;
}

#[async_recursion]
pub async fn get_all_testcase_data(now_subtask_id: i64, db: &DatabaseConnection) -> Result<Vec<Saved<Testcase>>> {
    let mut res = vec![];
    let next_list = now_subtask_id.get_next_testcase(db).await?;
    for v in next_list {
        match v {
            NextJudge::Subtask(subtask) => {
                res = [res, get_all_testcase_data(subtask.id, db).await?].concat();
            },
            NextJudge::Testcase(testcase) => {
                res.push(testcase);
            }
        }
    }
    Ok(res)
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

    async fn get_all_testcase(&self, db: &DatabaseConnection) -> Result<Vec<Saved<Testcase>>> {
        get_all_testcase_data(self.get_id(), db).await
    }
}

impl Subtask {
    pub async fn create_for(&self, id: impl IdInfo, db: &DatabaseConnection) -> Result<()> {
        let saved = self.save().await?;
        MiscType::Subtask.add(db, id.get_id(), saved.id).await?;
        Ok(())
    }

    pub fn default(name: &str, platform: &str, msg: &str) -> Subtask {
        let uuid = uuid::Uuid::new_v4().to_string();
        Subtask {
            name: name.to_string(),
            uuid,
            limit: JudgeLimit {
                time_limit: -1,
                memory_limit: -1,
            },
            option_platform: platform.to_string(),
            detail: SubtaskDetail::AutoCreate {
                msg: msg.to_string(),
            }
        }
    }
}

impl RootSubtask {
    pub async fn create_for_problem(&self, problem: impl IdInfo, db: &DatabaseConnection) -> Result<Saved<RootSubtask>> {
        let saved = self.save().await?;
        MiscType::Subtask.add(db, problem.get_id(), saved.id).await?;
        Ok(saved)
    }

    pub fn default(name: &str, platform: &str, msg: &str) -> RootSubtask {
        RootSubtask {
            subtask: Subtask::default(name, platform, msg),
            platform: Some(platform.to_string()),
            can_judge: false,
        }
    }

    pub fn set_judge(self) -> Self {
        Self {
            can_judge: true,
            ..self
        }
    }

}

pub trait GetSubtask {
    /// 此函数目的是获得相关的subtask.
    fn get_related_subtask(&self, db: &DatabaseConnection) -> impl Future<Output = Result<Saved<Subtask>>>;
}

impl<T: IdInfo> GetSubtask for T {
    async fn get_related_subtask(&self, db: &DatabaseConnection) -> Result<Saved<Subtask>> {
        let res = MiscType::Subtask.get_next_list(&db, self.get_id()).await?;
        log::debug!("related msg: {:?}", res);
        if res.is_empty() {
            Err(NoRelatedSubtask(self.get_id()))?
        }
        let res = res[0];
        Saved::<Subtask>::get(res).await
    }
}