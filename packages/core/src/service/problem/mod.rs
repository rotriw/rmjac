use sea_orm::{DatabaseConnection, EntityTrait};
use crate::model::problem::{Difficulty, Problem, ProblemStatement};
use crate::service::save::{ManageService, Saved};
use crate::{db, Result};
use crate::action::default::MiscType;
use crate::db::entity::edge::misc::Entity;

pub trait BasicProblemInfo {
    fn get_name(&self) -> String;

    fn get_time_limit(&self) -> i64;
    fn get_memory_limit(&self) -> i64;
    fn get_difficulty(&self) -> Difficulty;
    fn get_platform(&self) -> String;
}


impl BasicProblemInfo for Problem {

    fn get_name(&self) -> String {
        self.name.clone()
    }

    fn get_time_limit(&self) -> i64 {
        self.limit.time_limit
    }

    fn get_memory_limit(&self) -> i64 {
        self.limit.memory_limit
    }

    fn get_difficulty(&self) -> Difficulty {
        self.difficulty.clone()
    }

    fn get_platform(&self) -> String {
        self.platform.clone()
    }
}

impl Saved<Problem> {
    pub async fn attach_statement(&self, db: &DatabaseConnection, statement: &Saved<ProblemStatement>) -> Result<()> {
        MiscType::Statement.add(db, self.id, statement.id).await
    }
}

pub trait ProblemView {
    fn get_statements(&self, db: &DatabaseConnection) -> impl Future<Output = Vec<Saved<ProblemStatement>>>;
}

impl ProblemView for Saved<Problem> {
    async fn get_statements(&self, db: &DatabaseConnection) -> Vec<Saved<ProblemStatement>> {
        let edges = MiscType::Statement.get_next_list(db, self.id).await;
        if edges.is_err() {
            return vec![];
        }
        let edges = edges.unwrap();
        let mut res = vec![];
        for edge in edges {
            res.push(Saved::get(edge).await.unwrap());
        }
        res
    }
}