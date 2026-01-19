#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct TestcaseEdge {
    pub id: i64,
    pub u: i64,
    pub v: i64,
    pub order: i64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct TestcaseEdgeRaw {
    pub u: i64,
    pub v: i64,
    pub order: i64,
}

impl EdgeRaw<TestcaseEdge, Model, ActiveModel> for TestcaseEdgeRaw {
    fn get_edge_type(&self) -> &str {
        "testcase_edge"
    }

    fn get_edge_id_column(
        &self,
    ) -> <<ActiveModel as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Column {
        Column::EdgeId
    }

    fn get_u_node_id(&self) -> i64 {
        self.u
    }

    fn get_v_node_id(&self) -> i64 {
        self.v
    }
}

impl From<TestcaseEdgeRaw> for ActiveModel {
    fn from(raw: TestcaseEdgeRaw) -> Self {
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
pub struct TestcaseEdgeQuery;

impl From<Model> for TestcaseEdge {
    fn from(model: Model) -> Self {
        TestcaseEdge {
            id: model.edge_id,
            u: model.u_node_id,
            v: model.v_node_id,
            order: model.order,
        }
    }
}

impl Edge<ActiveModel, Model, Entity> for TestcaseEdge {
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
impl EdgeQuery<ActiveModel, Model, Entity, TestcaseEdge> for TestcaseEdgeQuery {
    fn get_edge_type() -> &'static str {
        "training_problem"
    }
}

impl EdgeQueryOrder<ActiveModel, Model, Entity, TestcaseEdge> for TestcaseEdgeQuery {}

use crate::db::entity::edge::testcase::{ActiveModel, Column, Entity, Model};
use crate::graph::edge::{Edge, EdgeQuery, EdgeQueryOrder, EdgeRaw};
use serde::{Deserialize, Serialize};
