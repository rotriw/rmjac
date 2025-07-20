use crate::db::entity::edge::problem_statement::{ActiveModel, Column, Entity, Model};
use crate::graph::edge::{Edge, EdgeQuery, EdgeRaw};

#[derive(Clone, Debug, PartialEq)]
pub struct ProblemStatementEdge {
    pub id: i64,
    pub u: i64,
    pub v: i64,
    pub copyright_risk: i64,
}

#[derive(Clone, Debug, PartialEq)]
pub struct ProblemStatementEdgeRaw {
    pub u: i64,
    pub v: i64,
    pub copyright_risk: i64,
}

impl EdgeRaw<ProblemStatementEdge, Model, ActiveModel> for ProblemStatementEdgeRaw {
    fn get_edge_type(&self) -> &str {
        "problem_statement"
    }

    fn get_edge_id_column(
        &self,
    ) -> <<ActiveModel as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Column {
        Column::EdgeId
    }
}

impl From<ProblemStatementEdgeRaw> for ActiveModel {
    fn from(raw: ProblemStatementEdgeRaw) -> Self {
        use sea_orm::ActiveValue::{NotSet, Set};
        ActiveModel {
            edge_id: NotSet,
            u_node_id: Set(raw.u),
            v_node_id: Set(raw.v),
            copyright_risk: Set(raw.copyright_risk),
        }
    }
}

impl From<Model> for ProblemStatementEdge {
    fn from(model: Model) -> Self {
        ProblemStatementEdge {
            id: model.edge_id,
            u: model.u_node_id,
            v: model.v_node_id,
            copyright_risk: model.copyright_risk,
        }
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct ProblemStatementEdgeQuery;

impl Edge<ActiveModel, Model, Entity> for ProblemStatementEdge {
    fn get_edge_id(&self) -> i64 {
        self.id
    }
}
impl EdgeQuery<ActiveModel, Model, Entity, ProblemStatementEdge> for ProblemStatementEdgeQuery {
    fn get_edge_type() -> &'static str {
        "problem_statement"
    }
}
