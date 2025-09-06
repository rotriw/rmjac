#[derive(Clone, Debug, PartialEq)]
pub struct TrainingProblemEdge {
    pub id: i64,
    pub u: i64,
    pub v: i64,
    pub order: i64,
}

#[derive(Clone, Debug, PartialEq)]
pub struct TrainingProblemEdgeRaw {
    pub u: i64,
    pub v: i64,
    pub order: i64,
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

use crate::db::entity::edge::training_problem::{ActiveModel, Column, Entity, Model};
use crate::graph::edge::{Edge, EdgeQuery, EdgeRaw};
