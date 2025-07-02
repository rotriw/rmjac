
use crate::db::entity::edge::problem_limit;
use crate::graph::edge::EdgeRaw;


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

impl EdgeRaw<ProblemLimitEdge, problem_limit::Model, problem_limit::ActiveModel>
    for ProblemLimitEdgeRaw
{
    fn get_edge_type(&self) -> &str {
        "problem_limit"
    }

    fn get_edge_id_column(&self) -> <<problem_limit::ActiveModel as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Column{
        problem_limit::Column::EdgeId
    }
}

impl From<ProblemLimitEdgeRaw> for problem_limit::ActiveModel {
    fn from(raw: ProblemLimitEdgeRaw) -> Self {
        use sea_orm::ActiveValue::{NotSet, Set};
        problem_limit::ActiveModel {
            edge_id: NotSet,
            u_node_id: Set(raw.u),
            v_node_id: Set(raw.v),
        }
    }
}

pub struct ProblemLimitEdgeQuery;
