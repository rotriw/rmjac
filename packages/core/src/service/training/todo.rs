use std::cmp::max;

use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, IntoActiveModel, NotSet,
    QueryFilter, QueryOrder, Set,
};

use crate::db::entity::edge::todolist_ownproblem;
use crate::db::entity::edge::user_own::OwnedData;
use crate::error::CoreError;
use crate::model::training::{TodoList, TodoListItem, TodoProblemItem};
use crate::model::user::User;
use crate::service::save::{ManageService, SaveService, Saved};
use crate::Result;

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
            if let OwnedData::TODO { .. } = json {
                res.push(Saved::get(d.task_id).await?);
            }
        }
        Ok(res)
    }

    pub async fn ensure_todo_owner(&self, db: &DatabaseConnection, todo_id: i64) -> Result<()> {
        use crate::db::entity::edge::user_own::{Column, Entity};

        let relation = Entity::find()
            .filter(Column::UserId.eq(self.id))
            .filter(Column::TaskId.eq(todo_id))
            .one(db)
            .await?;

        let relation = relation.ok_or_else(|| CoreError::NotFound("todo not found".to_string()))?;
        let owned_data: OwnedData = serde_json::from_str(&relation.data)?;

        if !matches!(owned_data, OwnedData::TODO { .. }) {
            return Err(CoreError::Conflict("target is not a todo list".to_string()));
        }

        Ok(())
    }

    pub async fn get_all_todo_with_problems(
        &self,
        db: &DatabaseConnection,
    ) -> Result<Vec<TodoListWithProblems>> {
        let todos = self.get_all_todo(db).await?;
        let mut result = Vec::with_capacity(todos.len());

        for todo in todos {
            let problems = todolist_ownproblem::Entity::find()
                .filter(todolist_ownproblem::Column::TodoListId.eq(todo.id))
                .order_by_asc(todolist_ownproblem::Column::Order)
                .all(db)
                .await?;

            result.push(TodoListWithProblems { todo, problems });
        }

        Ok(result)
    }

    pub async fn get_all_todo_items(&self, db: &DatabaseConnection) -> Result<Vec<TodoListItem>> {
        let items = self
            .get_all_todo_with_problems(db)
            .await?
            .into_iter()
            .map(to_todo_list_item)
            .collect();
        Ok(items)
    }

    pub async fn remove_todo(&self, db: &DatabaseConnection, todo_id: i64) -> Result<()> {
        use crate::db::entity::edge::user_own::{Column as OwnColumn, Entity as OwnEntity};

        self.ensure_todo_owner(db, todo_id).await?;

        let own_relations = OwnEntity::find()
            .filter(OwnColumn::UserId.eq(self.id))
            .filter(OwnColumn::TaskId.eq(todo_id))
            .all(db)
            .await?;
        for relation in own_relations {
            relation.into_active_model().delete(db).await?;
        }

        let problem_edges = todolist_ownproblem::Entity::find()
            .filter(todolist_ownproblem::Column::TodoListId.eq(todo_id))
            .all(db)
            .await?;
        for edge in problem_edges {
            edge.into_active_model().delete(db).await?;
        }

        Saved::<TodoList>::get(todo_id).await?.delete(todo_id).await?;
        Ok(())
    }
}

#[derive(Debug, Clone)]
pub struct TodoListWithProblems {
    pub todo: Saved<TodoList>,
    pub problems: Vec<todolist_ownproblem::Model>,
}

fn to_todo_list_item(item: TodoListWithProblems) -> TodoListItem {
    TodoListItem {
        id: item.todo.id,
        color: item.todo.data.color,
        description: item.todo.data.description,
        problems: item
            .problems
            .into_iter()
            .map(|problem| TodoProblemItem {
                edge_id: problem.edge_id,
                order: problem.order,
                problem_id: problem.problem_id,
                problem_iden: problem.problem_iden,
                description: problem.description,
            })
            .collect(),
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
        let data = todolist_ownproblem::Entity::find()
            .filter(todolist_ownproblem::Column::TodoListId.eq(self.id))
            .all(db)
            .await?;
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
        let max_order = self.get_max_order(db).await?;
        todolist_ownproblem::ActiveModel {
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
        let v = todolist_ownproblem::Entity::find()
            .filter(todolist_ownproblem::Column::ProblemId.eq(problem_id))
            .filter(todolist_ownproblem::Column::TodoListId.eq(self.id))
            .all(db)
            .await?;
        for i in v {
            i.into_active_model().delete(db).await?;
        }
        Ok(())
    }

    pub async fn has_problem(&self, db: &DatabaseConnection, problem_id: i64) -> Result<bool> {
        let exists = todolist_ownproblem::Entity::find()
            .filter(todolist_ownproblem::Column::TodoListId.eq(self.id))
            .filter(todolist_ownproblem::Column::ProblemId.eq(problem_id))
            .one(db)
            .await?
            .is_some();
        Ok(exists)
    }

    pub async fn reorder_problems(&self, db: &DatabaseConnection, edge_ids: &[i64]) -> Result<()> {
        let existing = todolist_ownproblem::Entity::find()
            .filter(todolist_ownproblem::Column::TodoListId.eq(self.id))
            .all(db)
            .await?;

        let mut order_map = std::collections::HashMap::new();
        for (idx, edge_id) in edge_ids.iter().enumerate() {
            order_map.insert(*edge_id, idx as i64);
        }

        for edge in existing {
            if let Some(next_order) = order_map.get(&edge.edge_id) {
                let mut model = edge.into_active_model();
                model.order = Set(*next_order);
                model.save(db).await?;
            }
        }

        Ok(())
    }
}

