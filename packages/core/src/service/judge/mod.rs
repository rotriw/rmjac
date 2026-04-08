use crate::Result;
use crate::action::default::MiscType;
use crate::error::CoreError;
use crate::model::judge::{
    JudgeInfo, JudgeLimit, JudgeResult, RootSubtask, Subtask, Testcase, TestcaseDetail,
};
use crate::model::problem::Problem;
use crate::model::record;
use crate::model::record::JudgeStatus::Accepted;
use crate::model::record::{BasicRecord, DetailSubtask, JudgeStatus, JudgeTotal, Record};
use crate::service::judge::calc::CalcScore;
use crate::service::record::subtask::{GetSubtask, SubtaskAction};
use crate::service::record::{BasicRecordInfo, ConnectOption};
use crate::service::save::{IdInfo, ManageService, SaveService, Saved};
use sea_orm::{ActiveModelTrait, DatabaseConnection, EntityTrait, NotSet, Set};
use std::collections::HashMap;

// pub mod provider;
// pub mod service;
pub mod calc;


pub trait JudgeOne {
    fn judge_one(
        &self,
        data: JudgeInfo,
        db: &DatabaseConnection,
    ) -> impl Future<Output = Result<()>>;
}

impl<R: IdInfo, T: IdInfo> JudgeOne for (&R, &T) {
    async fn judge_one(&self, data: JudgeInfo, db: &DatabaseConnection) -> Result<()> {
        use crate::db::entity::edge::judge::*;
        ActiveModel {
            edge_id: NotSet,
            record_id: Set(self.0.get_id()),
            testcase_id: Set(self.1.get_id()),
            judge_info: Set(data),
        }
        .save(db)
        .await?;
        Ok(())
    }
}

pub trait SetJudgeResult {
    fn set_judge_result(
        &self,
        detail: &JudgeResult,
        problem: impl IdInfo,
        db: &DatabaseConnection,
        option: ConnectOption,
    ) -> impl Future<Output = Result<()>>;
}

impl<R: BasicRecordInfo + Send> SetJudgeResult for Saved<R> {
    async fn set_judge_result(
        &self,
        detail: &JudgeResult,
        problem: impl IdInfo,
        db: &DatabaseConnection,
        option: ConnectOption,
    ) -> Result<()> {
        let get_root_subtask = problem.get_related_subtask(db).await;
        log::debug!("start to add judge_detail for record:{}", self.get_id());
        let root_subtask = if get_root_subtask.is_err() {
            if let Err(CoreError::NoRelatedSubtask(_)) = get_root_subtask
                && option.force_create_root_subtask
            {
                let problem = Saved::<Problem>::get(problem.get_id()).await?;
                RootSubtask::default(
                    &format!("Remotejudge {}", problem.id),
                    &problem.data.platform,
                    "Auto created by judge_update.",
                )
                .create_for_problem(problem, db)
                .await?
                .id
            } else {
                return Err(get_root_subtask.err().unwrap());
            }
        } else {
            get_root_subtask?.id
        };
        log::debug!("{}", root_subtask);
        let testcases = root_subtask.get_all_testcase(db).await?;
        log::info!("{:?}", testcases);
        let mut testcase_hashmap = HashMap::new();
        for x in testcases {
            testcase_hashmap.insert(x.data.name.clone(), x.id);
        }
        match detail {
            JudgeResult::Result(r) => {
                (self, &root_subtask).judge_one(r.clone(), db).await?;
                return Ok(());
            }
            JudgeResult::PassedOnly(passed) => {
                (self, &root_subtask)
                    .judge_one(
                        JudgeInfo::from_status(if *passed {
                            JudgeStatus::Accepted
                        } else {
                            JudgeStatus::Reject
                        }),
                        db,
                    )
                    .await?;
                return Ok(());
            }
            _ => {}
        }
        let mut not_haved = vec![];
        if let JudgeResult::List(list_v) = detail {
            for (key, info) in list_v {
                if testcase_hashmap.contains_key(key) {
                    continue;
                }
                not_haved.push(key);
            }
        }
        if !not_haved.is_empty() && option.append_place.is_none() {
            Err(format!(
                "Error: record can't be judge, because there are some testcase name not found. {:?}, please add append_place sign or recheck.",
                not_haved
            ))?;
        } else if !not_haved.is_empty() {
            let append_id = option.append_place.unwrap();
            let append_id = if append_id == -1 {
                root_subtask
            } else {
                append_id
            };
            for id in not_haved {
                let testcase = Testcase {
                    name: id.clone(),
                    uuid: uuid::Uuid::new_v4().to_string(),
                    limit: JudgeLimit {
                        time_limit: -1,
                        memory_limit: -1,
                    },
                    detail: TestcaseDetail::NoExtraData,
                }
                .create_for(append_id, db)
                .await?
                .id;
                testcase_hashmap.insert(id.clone(), testcase);
            }
        }
        if let JudgeResult::List(list_v) = detail {
            for (key, info) in list_v {
                let testcase = testcase_hashmap.get(key).unwrap();
                (self, testcase).judge_one(info.clone(), db).await?;
            }
        }
        let subtask = Saved::<Subtask>::get(root_subtask).await?;
        let res = (self, &subtask).calc_score(db).await?;
        res.update_for(self.id, db).await?;
        Ok(())
    }
}

impl Testcase {
    pub async fn create_for(
        &self,
        id: impl IdInfo,
        db: &DatabaseConnection,
    ) -> Result<Saved<Testcase>> {
        let saved = self.save().await?;
        MiscType::Order.add(db, id.get_id(), saved.id).await?;
        Ok(saved)
    }
}

impl DetailSubtask {
    pub async fn update_for(&self, record_id: impl IdInfo, db: &DatabaseConnection) -> Result<()> {
        // TODO.
        // let record = Saved::<BasicRecord>::get(record_id.get_id()).await?;
        // let is_passed = record.data.judge_detail.is_passed;
        // let mut detail = record.data.judge_detail.detail.clone();
        // // 其实现在没啥好算的，这个函数没有工作。
        // record.modify("judge_detail", &JudgeTotal {
        //     is_passed,
        //     status: self.status.clone(),
        //     detail,
        // }).await?;
        // Update database.
        Ok(())
    }
}

// pub mod service;
pub mod impled;