use crate::Result;
use sea_orm::ColumnTrait;
use ambassador::{delegatable_trait, delegate_to_methods};
use sea_orm::{DatabaseConnection, EntityTrait, QueryFilter};
use sea_orm::sea_query::ColumnRef::Column;
use crate::error::CoreError;
use crate::model::judge::{JudgeInfo, JudgeMethod, JudgeResult, RootSubtask, Subtask, Testcase, TestcaseDetail};
use crate::model::problem::Problem;
use crate::model::record::{BasicRecord, DetailTestcase, JudgeStatus, JudgeTotal, Record};
use crate::model::user::User;
use crate::service::record::subtask::{GetSubtask, SubtaskAction};
use crate::service::save::{IdInfo, ManageService, SaveService, Saved};
pub mod subtask;
pub mod query;
pub mod create;

pub trait BasicRecordInfo {
    fn get_total(&self) -> JudgeTotal;
    fn get_user(&self) -> impl Future<Output = Saved<User>>;
    fn get_user_id(&self) -> i64;
    fn get_problem_id(&self) -> i64;
    fn get_problem(&self) -> impl Future<Output = Saved<Problem>> {
        async move {
            Saved::get(self.get_problem_id()).await.unwrap()
        }
    }
    fn get_code(&self) -> String {
        String::from("[no-fetch]")
    }

    fn get_language(&self) -> String;
}
impl BasicRecordInfo for BasicRecord {
    fn get_total(&self) -> JudgeTotal {
        self.judge_detail.clone()
    }
    async fn get_user(&self) -> Saved<User> {
        Saved::get(self.user_id).await.unwrap()
    }

    fn get_user_id(&self) -> i64 {
        self.user_id
    }

    fn get_problem_id(&self) -> i64 {
        self.problem_id
    }

    fn get_language(&self) -> String {
        self.language.clone()
    }
}

impl BasicRecordInfo for Record {
    fn get_total(&self) -> JudgeTotal {
        self.basic.judge_detail.clone()
    }

    async fn get_user(&self) -> Saved<User> {
        Saved::get(self.basic.user_id).await.unwrap()
    }

    fn get_user_id(&self) -> i64 {
        self.basic.user_id
    }

    fn get_problem_id(&self) -> i64 {
        self.basic.problem_id
    }

    fn get_code(&self) -> String {
        self.code.clone()
    }

    fn get_language(&self) -> String {
        self.basic.language.clone()
    }
}

pub trait BasicSubtaskInfo {
    fn get_name(&self) -> String;
}

impl BasicSubtaskInfo for Subtask {

    fn get_name(&self) -> String {
        self.name.clone()
    }
}

pub trait BasicTestcaseInfo {
    fn get_name(&self) -> String;
    fn get_detail(&self) -> TestcaseDetail;
}

impl BasicTestcaseInfo for Testcase {
    fn get_name(&self) -> String {
        self.name.clone()
    }

    fn get_detail(&self) -> TestcaseDetail {
        self.detail.clone()
    }
}

impl<T: BasicTestcaseInfo> BasicTestcaseInfo for Saved<T> {
    fn get_name(&self) -> String {
        self.data.get_name()
    }

    fn get_detail(&self) -> TestcaseDetail {
        self.data.get_detail()
    }
}

impl<T: BasicRecordInfo> BasicRecordInfo for Saved<T> {
    fn get_total(&self) -> JudgeTotal {
        self.data.get_total()
    }

    fn get_user(&self) -> impl Future<Output=Saved<User>> {
        self.data.get_user()
    }

    fn get_user_id(&self) -> i64 {
        self.data.get_user_id()
    }

    fn get_problem_id(&self) -> i64 {
        self.data.get_problem_id()
    }

    fn get_code(&self) -> String {
        self.data.get_code()
    }

    fn get_language(&self) -> String {
        self.data.get_language()
    }
}

pub trait RecordResult {
    fn on_testcase<T>(&self, db: &DatabaseConnection, testcase: &Saved<T>) -> impl Future<Output = Result<JudgeInfo>>;
}

impl<R: IdInfo + BasicRecordInfo> RecordResult for R {
    async fn on_testcase<T>(&self, db: &DatabaseConnection, testcase: &Saved<T>) -> Result<JudgeInfo> {
        use crate::db::entity::edge::judge::*;
        let m = Entity::find()
            .filter(Column::TestcaseId.eq(testcase.id))
            .filter(Column::RecordId.eq(self.get_id()))
            .one(db).await?;
        if m.is_none() {
            return Ok(JudgeInfo {
                judge_method: JudgeMethod::Unknown,
                status: JudgeStatus::Skipped,
                time: 0,
                memory: 0,
                score: 0f64,
                passed: false
            });
        }
        Ok(m.unwrap().judge_info)
    }
}

#[derive(Default)]
pub struct ConnectOption {
    // 如果此处为 Some, 并包含值，那么如果找不到测试点信息，将在此后面自动追加。
    pub append_place: Option<i64>,
    // 如果此项为真, 题目如果没有测试节点，则会强制创建一个默认节点。
    pub force_create_root_subtask: bool,
}
