use sea_orm::{QueryFilter, QueryOrder};
use sea_orm::ColumnTrait;

#[derive(Clone, Debug, PartialEq)]

pub enum TrainingProblemType {
    Default,
    Preset,
    PresetForce,
    OnlyPreview,
}

#[derive(Clone, Debug, PartialEq)]
pub struct TrainingProblemEdge {
    pub id: i64,
    pub u: i64,
    pub v: i64,
    pub order: i64,
    pub problem_type: TrainingProblemType,
}

#[derive(Clone, Debug, PartialEq)]
pub struct TrainingProblemEdgeRaw {
    pub u: i64,
    pub v: i64,
    pub order: i64,
    pub problem_type: TrainingProblemType,
}

impl EdgeRaw<TrainingProblemEdge, Model, ActiveModel> for TrainingProblemEdgeRaw {
    fn get_edge_type(&self) -> &str {
        "training_problem"
    }

    fn get_edge_id_column(
        &self,
    ) -> <<ActiveModel as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Column {
        Column::EdgeId
    }
}

impl From<TrainingProblemEdgeRaw> for ActiveModel {
    fn from(raw: TrainingProblemEdgeRaw) -> Self {
        use sea_orm::ActiveValue::{NotSet, Set};
        ActiveModel {
            edge_id: NotSet,
            u_node_id: Set(raw.u),
            v_node_id: Set(raw.v),
            order: Set(raw.order),
            problem_type: Set(raw.problem_type.into()),
        }
    }
}

impl From<String> for TrainingProblemType {
    fn from(s: String) -> Self {
        match s.as_str() {
            "preset" => TrainingProblemType::Preset,
            "preset_force" => TrainingProblemType::PresetForce,
            "only_preview" => TrainingProblemType::OnlyPreview,
            _ => TrainingProblemType::Default,
        }
    }
}

impl From<TrainingProblemType> for String {
    fn from(pt: TrainingProblemType) -> Self {
        match pt {
            TrainingProblemType::Preset => "preset".to_string(),
            TrainingProblemType::PresetForce => "preset_force".to_string(),
            TrainingProblemType::OnlyPreview => "only_preview".to_string(),
            TrainingProblemType::Default => "default".to_string(),
        }
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct TrainingProblemEdgeQuery;

impl From<Model> for TrainingProblemEdge {
    fn from(model: Model) -> Self {
        TrainingProblemEdge {
            id: model.edge_id,
            u: model.u_node_id,
            v: model.v_node_id,
            order: model.order,
            problem_type: model.problem_type.into(),
        }
    }
}

impl Edge<ActiveModel, Model, Entity> for TrainingProblemEdge {
    fn get_edge_id(&self) -> i64 {
        self.id
    }
    fn get_u_node_id(&self) -> i64 {
        self.u
    }
    fn get_v_node_id(&self) -> i64 {
        self.v
    }
}
impl EdgeQuery<ActiveModel, Model, Entity, TrainingProblemEdge> for TrainingProblemEdgeQuery {
    fn get_edge_type() -> &'static str {
        "training_problem"
    }
}

impl EdgeQueryOrder<ActiveModel, Model, Entity, TrainingProblemEdge> for TrainingProblemEdgeQuery {
    async fn get_order_id(u: i64, order: i64, db: &DatabaseConnection) -> Result<i64> {
        let val = Entity::find()
            .filter(Column::UNodeId.eq(u))
            .filter(Column::Order.eq(order))
            .one(db)
            .await?;
        if let Some(val) = val {
            Ok(val.v_node_id)
        } else {
            Err(CoreError::NotFound("Cannot found specific order.".to_string()))
        }
    }

    async fn get_order_asc(u: i64, db: &DatabaseConnection) -> Result<Vec<i64>> {
        Ok(Entity::find()
            .filter(Column::UNodeId.eq(u))
            .order_by_asc(Column::Order)
            .all(db)
            .await?
            .into_iter().map(|m| m.v_node_id).collect())
    }

    async fn get_order_asc_extend(u: i64, db: &DatabaseConnection) -> Result<Vec<TrainingProblemEdge>> {
        let models = Entity::find()
            .filter(Column::UNodeId.eq(u))
            .order_by_asc(Column::Order)
            .all(db)
            .await?;
        Ok(models.into_iter().map(|m| m.into()).collect())
    }

    async fn get_order_desc(u: i64, db: &DatabaseConnection) -> Result<Vec<i64>> {
        Ok(Entity::find()
            .filter(Column::UNodeId.eq(u))
            .order_by_desc(Column::Order)
            .all(db)
            .await?
            .into_iter().map(|m| m.v_node_id).collect())
    }

    async fn get_order_desc_extend(u: i64, db: &DatabaseConnection) -> Result<Vec<TrainingProblemEdge>> {
        let models = Entity::find()
            .filter(Column::UNodeId.eq(u))
            .order_by_desc(Column::Order)
            .all(db)
            .await?;
        Ok(models.into_iter().map(|m| m.into()).collect())
    }
}

use crate::Result;
use sea_orm::{DatabaseConnection, EntityTrait};
use crate::db::entity::edge::training_problem::{ActiveModel, Column, Entity, Model};
use crate::error::CoreError;
use crate::graph::edge::{Edge, EdgeQuery, EdgeQueryOrder, EdgeRaw};
