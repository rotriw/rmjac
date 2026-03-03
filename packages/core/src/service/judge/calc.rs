use std::collections::HashMap;
use async_recursion::async_recursion;
use sea_orm::DatabaseConnection;
use sea_orm::prelude::async_trait::async_trait;
use serde::{Deserialize, Serialize};
use crate::action::default::MiscType;
use crate::model::judge::{JudgeInfo, JudgeMethod, Subtask};
use crate::model::record::{BasicRecord, DetailSubtask, DetailSubtaskChildren, DetailTestcase, JudgeStatus};
use crate::Result;
use crate::service::record::{BasicRecordInfo, BasicSubtaskInfo, BasicTestcaseInfo, RecordResult};
use crate::service::record::subtask::{NextJudge, SubtaskAction};
use crate::service::save::{IdInfo, ManageService, Saved};

pub trait CalcScore {

    fn calc_score(&self, db: &DatabaseConnection) -> impl Future<Output = Result<DetailSubtask>>;
}

trait CalcSubtaskScore {
    fn calc_subtask_score<S>(&self, subtask: &Saved<S>, saved: &mut HashMap<i64, MixInfo>) -> MixInfo;
    fn build_tree<S: BasicSubtaskInfo>(&self, subtask: &Saved<S>, saved: &HashMap<i64, MixInfo>) -> DetailSubtask;
}


#[derive(Debug, Clone, Serialize, Deserialize)]
struct MixInfo {
    pub status: JudgeStatus,
    pub total_testcase: i64,
    pub passed_testcase: i64,
    pub now_score: f64,
    pub time: f64,
    pub memory: f64,
}


impl std::ops::Add for MixInfo {
    type Output = MixInfo;
    fn add(self, rhs: Self) -> Self::Output {
        let mut res = MixInfo {
            status: self.status.clone(),
            total_testcase: self.total_testcase + rhs.total_testcase,
            passed_testcase: self.passed_testcase + rhs.passed_testcase,
            now_score: self.now_score + rhs.now_score,
            time: self.time + rhs.time,
            memory: self.memory + rhs.memory,
        };
        if self.status == JudgeStatus::Accepted {
            res.status = rhs.status.clone();
        }
        res
    }
}


impl CalcSubtaskScore for (&HashMap<i64, JudgeInfo>, &HashMap<i64, Vec<NextJudge>>) {
    fn calc_subtask_score<S>(&self, subtask: &Saved<S>, saved: &mut HashMap<i64, MixInfo>) -> MixInfo {
        let next_steps = self.1.get(&subtask.id);
        if next_steps.is_none() {
            return MixInfo {
                status: JudgeStatus::Unknown,
                total_testcase: 0,
                passed_testcase: 0,
                now_score: 0f64,
                time: 0f64,
                memory: 0f64,
            }
        }
        let next_steps = next_steps.unwrap();
        if saved.get(&subtask.id).is_some() {
            return saved.get(&subtask.id).unwrap().clone();
        }
        let mut res = MixInfo {
            status: JudgeStatus::Accepted,
            total_testcase: 0,
            passed_testcase: 0,
            now_score: 0f64,
            time: 0f64,
            memory: 0f64,
        };
        for step in next_steps {
            match step {
                NextJudge::Subtask(subtask) => {
                    let subtask_info = self.calc_subtask_score(subtask, saved);
                    res = res + subtask_info;
                },
                NextJudge::Testcase(testcase) => {
                    let testcase_info = self.0.get(&testcase.id);
                    if testcase_info.is_none() {
                        continue;
                    }
                    let testcase_info = testcase_info.unwrap();
                    res = res + MixInfo {
                        status: testcase_info.status.clone(),
                        total_testcase: 1,
                        passed_testcase: testcase_info.passed as i64,
                        now_score: testcase_info.score,
                        time: testcase_info.time as f64,
                        memory: testcase_info.memory as f64,
                    };
                },
            }
        }
        saved.insert(subtask.id, res.clone());
        res
    }

    fn build_tree<S: BasicSubtaskInfo>(&self, subtask: &Saved<S>, saved: &HashMap<i64, MixInfo>) -> DetailSubtask {
        let next_steps = self.1.get(&subtask.id).unwrap();
        let mut children = vec![];
        for step in next_steps {
            match step {
                NextJudge::Subtask(subtask) => {
                    if saved.get(&subtask.id).is_some() {
                        let data = saved.get(&subtask.id).unwrap();
                        children.push(DetailSubtaskChildren::Subtask(DetailSubtask {
                            status: data.status.clone(),
                            name: subtask.data.get_name(),
                            score: data.now_score,
                            time: data.time as i64,
                            memory: data.memory as i64,
                            detail: vec![],
                        }));
                    } else {
                        children.push(DetailSubtaskChildren::Subtask(self.build_tree(subtask, saved)));
                    }
                },
                NextJudge::Testcase(testcase) => {
                    let data = self.0.get(&testcase.id).unwrap_or(&JudgeInfo {
                        judge_method: JudgeMethod::Unknown,
                        status: JudgeStatus::Skipped,
                        time: -1,
                        memory: -1,
                        score: 0f64,
                        passed: false,
                    });
                    children.push(DetailSubtaskChildren::Testcase(DetailTestcase {
                        status: data.status.clone(),
                        score: data.score,
                        time: data.time,
                        memory: data.memory,
                        detail: vec![],
                    }));
                }
            }
        }
        let now_data = saved.get(&subtask.id).unwrap();
        DetailSubtask {
            status: now_data.status.clone(),
            name: subtask.data.get_name(),
            score: now_data.now_score,
            time: now_data.time as i64,
            memory: now_data.memory as i64,
            detail: children
        }
    }
}


// record, root_subtask to refresh the score.
impl<Record, Subtask> CalcScore for (&Saved<Record>, &Saved<Subtask>) where
Record: Send + BasicRecordInfo,
Subtask: Send + BasicSubtaskInfo + Serialize + for<'de> Deserialize<'de> + Clone,
{
    async fn calc_score(&self, db: &DatabaseConnection) -> Result<DetailSubtask> {
        let (record, root_subtask) = self;
        let mut subtask_data = HashMap::new();
        let mut judge_info = HashMap::new();
        let mut que = queue::Queue::new();
        let _ = que.queue(root_subtask.id);
        while !que.is_empty() {
            let now_id = que.dequeue().unwrap();
            let next_steps = Saved::<Subtask>::get(now_id).await?.get_next_testcase(db).await?;
            for step in &next_steps {
                match step {
                    NextJudge::Testcase(testcase) => {
                        let data = self.0.on_testcase(db, testcase).await;
                        if let Ok(data) = data {
                            judge_info.insert(testcase.id, data);
                        }
                    },
                    NextJudge::Subtask(subtask) => {
                        let data = self.0.on_testcase(db, subtask).await;
                        if let Ok(data) = data {
                            judge_info.insert(subtask.id, data);
                        }
                        let _ = que.queue(subtask.id);
                    }
                }
            }
            subtask_data.insert(now_id, next_steps);
        }
        let mut result = HashMap::new();
        let _ = (&judge_info, &subtask_data).calc_subtask_score(root_subtask, &mut result);
        Ok((&judge_info, &subtask_data).build_tree(root_subtask, &result))
    }
}