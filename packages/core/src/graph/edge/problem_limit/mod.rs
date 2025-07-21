#[derive(Clone, Debug, PartialEq)]
pub struct ProblemLimitEdge {
    pub id: i64,
    pub u: i64,
    pub v: i64,
}

#[derive(Clone, Debug, PartialEq)]
pub struct ProblemLimitEdgeRaw {
    pub u: i64,
    pub v: i64,
}

impl EdgeRaw<ProblemLimitEdge, Model, ActiveModel> for ProblemLimitEdgeRaw {
    fn get_edge_type(&self) -> &str {
        "problem_limit"
    }

    fn get_edge_id_column(
        &self,
    ) -> <<ActiveModel as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Column {
        Column::EdgeId
    }
}

impl From<ProblemLimitEdgeRaw> for ActiveModel {
    fn from(raw: ProblemLimitEdgeRaw) -> Self {
        use sea_orm::ActiveValue::{NotSet, Set};
        ActiveModel {
            edge_id: NotSet,
            u_node_id: Set(raw.u),
            v_node_id: Set(raw.v),
        }
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct ProblemLimitEdgeQuery;

impl From<Model> for ProblemLimitEdge {
    fn from(model: Model) -> Self {
        ProblemLimitEdge {
            id: model.edge_id,
            u: model.u_node_id,
            v: model.v_node_id,
        }
    }
}

impl Edge<ActiveModel, Model, Entity> for ProblemLimitEdge {
    fn get_edge_id(&self) -> i64 {
        self.id
    }
}
impl EdgeQuery<ActiveModel, Model, Entity, ProblemLimitEdge> for ProblemLimitEdgeQuery {
    fn get_edge_type() -> &'static str {
        "problem_limit"
    }
}

use crate::db::entity::edge::problem_limit::{ActiveModel, Column, Entity, Model};
use crate::graph::edge::{Edge, EdgeQuery, EdgeRaw};