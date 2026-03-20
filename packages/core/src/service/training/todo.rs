use std::cmp::max;
use sea_orm::{ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, IntoActiveModel, NotSet, QueryFilter, Set};
use crate::action::default::MiscType;
use crate::db::entity::edge::record::ActiveModel;
use crate::db::entity::edge::user_own::OwnedData;
use crate::model::content::Description;
use crate::Result;
use crate::model::training::TodoList;
use crate::model::user::User;
use crate::service::save::{ManageService, SaveService, Saved};

/*
 * TODO is easy version of training, but todo can draw color for problem. the problem will show the problem color if this problem in the list.
 *
 *
 */

impl Saved<User> {
    pub async fn add_todo(&self, db: &DatabaseConnection, todo_id: i64, _todo_status: &str, description: &str) -> Result<()> {
        use crate::db::entity::edge::user_own::*;
        let json = serde_json::to_string( &OwnedData::TODO {
            status: TrainingStatus::Owned,
        })?;

        ActiveModel {
            edge_id: NotSet,
            user_id: Set(self.id),
            task_id: Set(todo_id),
            data: Set(json),
            order: Set(0),
            description: Set(Some(description.to_string())),
            public_hide: Set(false),
        }.save(db).await?;

        Ok(())
    }

    pub async fn get_all_todo(&self, db: &DatabaseConnection) -> Result<Vec<Saved<TodoList>>> {
        use crate::db::entity::edge::user_own::*;
        let data = Entity::find()
            .filter(Column::UserId.eq(self.id))
            .all(db).await?;
        let mut res = vec![];
        for d in data {
            let json: OwnedData = serde_json::from_str(&d.data)?;
            if let OwnedData::TODO { status } = json {
                res.push(Saved::get(d.task_id).await?);
            }
        }
        Ok(res)
    }
}
impl TodoList {
    pub async fn create(
        &self,
        db: &DatabaseConnection,
        user: &Saved<User>,
    ) -> Result<Saved<TodoList>> {
        let data = self.clone().save().await?;
        user.add_todo(db, data.id, "Basic todo", "default").await?;
        Ok(data)
    }
}

impl Saved<TodoList> {
    pub async fn get_max_order(&self, db: &DatabaseConnection) -> Result<i64> {
        use crate::db::entity::edge::todolist_ownproblem::*;
        let data = Entity::find()
            .filter(Column::ProblemId.eq(self.id))
            .all(db).await?;
        let mut res = 0;
        for i in data {
            res = max(res, i.order);
        }
        Ok(res)
    }

    pub async fn add_problem(
        &self,
        db: &DatabaseConnection,
        problem_iden: &str,
        problem_id: i64,
        description: &str,
    ) -> Result<()> {
        use crate::db::entity::edge::todolist_ownproblem::*;
        let max_order = self.get_max_order(db).await?;
        ActiveModel {
            edge_id: NotSet,
            order: Set(max_order + 1),
            todo_list_id: Set(self.id),
            problem_id: Set(problem_id),
            description: Set(description.to_string()),
            problem_iden: Set(problem_iden.to_string())
        }.save(db).await?;
        Ok(())
    }

    pub async fn remove_problem(
        &self,
        db: &DatabaseConnection,
        problem_id: i64,
    ) -> Result<()> {
        use crate::db::entity::edge::todolist_ownproblem::*;
        let v = Entity::find()
            .filter(Column::ProblemId.eq(problem_id))
            .filter(Column::TodoListId.eq(self.id))
            .all(db).await?;
        for i in v {
            i.into_active_model().delete(db).await?;
        }
        Ok(())
    }
}

