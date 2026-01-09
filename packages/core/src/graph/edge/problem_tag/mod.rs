#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct ProblemTagEdge {
    pub id: i64,
    pub u: i64,
    pub v: i64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct ProblemTagEdgeRaw {
    pub u: i64,
    pub v: i64,
}

impl EdgeRaw<ProblemTagEdge, problem_tag::Model, problem_tag::ActiveModel> for ProblemTagEdgeRaw {
    fn get_edge_type(&self) -> &str {
        "problem_tag"
    }

    fn get_edge_id_column(&self) -> <<problem_tag::ActiveModel as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Column{
        problem_tag::Column::EdgeId
    }

    fn get_u_node_id(&self) -> i64 {
        self.u
    }

    fn get_v_node_id(&self) -> i64 {
        self.v
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

#[derive(Clone)]
pub struct ProblemTagEdgeQuery;

impl Edge<problem_tag::ActiveModel, problem_tag::Model, problem_tag::Entity> for ProblemTagEdge {
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

impl EdgeQuery<problem_tag::ActiveModel, problem_tag::Model, problem_tag::Entity, ProblemTagEdge>
    for ProblemTagEdgeQuery
{
    fn get_edge_type() -> &'static str {
        "problem_tag"
    }
}

use crate::db::entity::edge::problem_tag;
use crate::graph::edge::{Edge, EdgeQuery, EdgeRaw};
use serde::{Deserialize, Serialize};
