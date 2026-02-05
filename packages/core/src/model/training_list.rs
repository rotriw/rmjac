use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, IntoActiveModel, QueryFilter};
use crate::error::CoreError;
use crate::graph::edge::EdgeRaw;
use crate::graph::edge::training_user::{TrainingStatus, TrainingUserEdge, TrainingUserEdgeRaw};
use crate::model::ModelStore;
use crate::Result;
pub struct TrainingList;

/*
TrainingList 负责单独的处理训练列表。
tid: training id
uid: user id
*/
impl TrainingList {
    pub async fn is_exist(store: &mut impl ModelStore, tid: i64, uid: i64) -> Result<bool> {
        use crate::db::entity::edge::training_user::{Entity, Column};
        
        let v = Entity::find()
            .filter(Column::UNodeId.eq(uid))
            .filter(Column::VNodeId.eq(tid))
            .one(store.get_db())
            .await?;

        Ok(v.is_some())
    }
    pub async fn invite(store: &mut impl ModelStore, tid: i64, uid: i64) -> Result<()> {
        if Self::is_exist(store, tid, uid).await? {
            return Err(CoreError::StringError("User have other status for this training.".to_string()));
        }
        TrainingUserEdgeRaw {
            u: uid,
            v: tid,
            status: TrainingStatus::Invited,
        }.save(store.get_db()).await?;
        Ok(())
    }

    pub async fn joined(store: &mut impl ModelStore, tid: i64, uid: i64) -> Result<()> {
        use crate::db::entity::edge::training_user::{Entity, Column};
        let mut edge = Entity::find()
            .filter(Column::UNodeId.eq(uid))
            .filter(Column::VNodeId.eq(tid))
            .one(store.get_db())
            .await?
            .ok_or(CoreError::StringError("No invited find.".to_string()))?
            .into_active_model();
        edge.set(Column::Status, (TrainingStatus::Joined as i64).into());
        edge.update(store.get_db()).await?;
        Ok(())
    }

    pub async fn own(store: &mut impl ModelStore, tid: i64, uid: i64) -> Result<()> {
        use crate::db::entity::edge::training_user::{Entity, Column};
        if Self::is_exist(store, tid, uid).await? {
            let mut edge = Entity::find()
                .filter(Column::UNodeId.eq(uid))
                .filter(Column::VNodeId.eq(tid))
                .one(store.get_db())
                .await?
                .ok_or(CoreError::StringError("TrainingUser edge not found.".to_string()))?
                .into_active_model();
            edge.set(Column::Status, (TrainingStatus::Owned as i64).into());
            edge.update(store.get_db()).await?;
            Ok(())
        } else {
            TrainingUserEdgeRaw {
                u: uid,
                v: tid,
                status: TrainingStatus::Owned,
            }.save(store.get_db()).await?;
            Ok(())
        }
    }

    pub async fn pin(store: &mut impl ModelStore, tid: i64, uid: i64, pin: bool) -> Result<()> {
        use crate::db::entity::edge::training_user::{Entity, Column};
        let mut edge = Entity::find()
            .filter(Column::UNodeId.eq(uid))
            .filter(Column::VNodeId.eq(tid))
            .one(store.get_db())
            .await?
            .ok_or(CoreError::StringError("TrainingUser edge not found.".to_string()))?
            .into_active_model();
        if pin {
            edge.set(Column::Status, (TrainingStatus::Pin as i64).into());
        } else {
            edge.set(Column::Status, (TrainingStatus::Joined as i64).into());
        }
        edge.update(store.get_db()).await?;
        Ok(())
    }

    pub async fn get(store: &mut impl ModelStore, uid: i64, c_type: TrainingStatus) -> Result<Vec<TrainingUserEdge>> {
        use crate::db::entity::edge::training_user::{Entity, Column};
        Ok(Entity::find()
            .filter(Column::UNodeId.eq(uid))
            .filter(Column::Status.eq(c_type as i64))
            .all(store.get_db())
            .await?
            .iter()
            .map(|e| e.clone().into())
            .collect())
    }
}
