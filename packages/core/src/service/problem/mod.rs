use sea_orm::DatabaseConnection;
use crate::model::problem::{Problem, ProblemStatement};
use crate::service::save::Saved;
use crate::{db, Result};
use crate::action::default::MiscType;

impl Saved<Problem> {
    pub async fn attach_statement(&self, db: &DatabaseConnection, statement: &Saved<ProblemStatement>) -> Result<()> {
        MiscType::Statement.add(db, self.id, statement.id).await
    }
}