use sea_orm::{ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, NotSet, QueryFilter, Set};
use crate::action::default::MiscType;
use crate::model::event::{Event, EventIden, EventParent};
use crate::model::problem::Problem;
use crate::service::event::create_event_iden;
use crate::service::save::{ManageService, Saved};
use crate::service::search::AddToSearch;
use crate::db::entity;
use crate::Result;

impl Saved<Event> {
    pub async fn set_event_problem_index(&self, p: &Saved<Problem>, db: &DatabaseConnection, iden: &str) -> Result<()> {
        entity::edge::event_problem::ActiveModel {
            edge_id: NotSet,
            event_id: Set(self.id),
            problem_id: Set(p.id),
            iden: Set(iden.to_string())
        }.save(db).await?;
        Ok(())
    }

    pub async fn attach_problem(&self, p: &Saved<Problem>, db: &DatabaseConnection, iden: &Vec<String>, sign: &str) -> Result<EventIden<Problem>> {
        self.set_event_problem_index(p, db, &iden[0]).await?;
        let ep = create_event_iden(p, iden, EventParent::ID(self.id), db, sign).await?;
        ep.set_can_search(db).await?;
        Ok(ep)
    }

    pub async fn get_problems(&self, db: &DatabaseConnection) -> Result<Vec<(Saved<Problem>, String)>> {
        let edges = entity::edge::event_problem::Entity::find()
            .filter(entity::edge::event_problem::Column::EventId.eq(self.id))
            .all(db)
            .await?;
        let mut res = vec![];
        for edge in edges {
            if let Ok(problem) = Saved::<Problem>::get(edge.problem_id).await {
                res.push((problem, edge.iden));
            }
        }
        Ok(res)
    }

    pub async fn get_next_events(&self, db: &DatabaseConnection) -> Result<Vec<Saved<Event>>> {
        let next_list = MiscType::Event.get_next_list(db, self.id).await?;
        let mut res = vec![];
        for next in next_list {
            if let Ok(value) = Saved::<Event>::get(next).await {
                res.push(value);
            }
        }
        Ok(res)
    }
}