
use crate::db::entity::edge::problem_tag;
use crate::graph::edge::EdgeRaw;


#[derive(Clone, Debug, PartialEq)]
pub struct ProblemTagEdge {
    pub id: i64,
    pub u: i64,
    pub v: i64,
}

#[derive(Clone, Debug, PartialEq)]
pub struct ProblemTagEdgeRaw {
    pub u: i64,
    pub v: i64,
}

impl EdgeRaw<ProblemTagEdge, problem_tag::Model, problem_tag::ActiveModel>
    for ProblemTagEdgeRaw
{
    fn get_edge_type(&self) -> &str {
        "problem_tag"
    }

    fn get_edge_id_column(&self) -> <<problem_tag::ActiveModel as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Column{
        problem_tag::Column::EdgeId
    }
}

impl From<ProblemTagEdgeRaw> for problem_tag::ActiveModel {
    fn from(raw: ProblemTagEdgeRaw) -> Self {
        use sea_orm::ActiveValue::{NotSet, Set};
        problem_tag::ActiveModel {
            edge_id: NotSet,
            u_node_id: Set(raw.u),
            v_node_id: Set(raw.v),
        }
    }
}

pub struct ProblemTagEdgeQuery;