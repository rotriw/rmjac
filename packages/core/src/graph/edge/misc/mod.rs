#[derive(Clone, Debug, PartialEq)]
pub struct MiscEdge {
    pub id: i64,
    pub u: i64,
    pub v: i64,
    pub misc_type: String,
}

#[derive(Clone, Debug, PartialEq)]
pub struct MiscEdgeRaw {
    pub u: i64,
    pub v: i64,
    pub misc_type: String,
}

impl EdgeRaw<MiscEdge, misc::Model, misc::ActiveModel> for MiscEdgeRaw {
    fn get_edge_type(&self) -> &str {
        "misc"
    }

    fn get_edge_id_column(&self) -> <<misc::ActiveModel as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Column{
        misc::Column::EdgeId
    }
}

impl From<MiscEdgeRaw> for misc::ActiveModel {
    fn from(raw: MiscEdgeRaw) -> Self {
        use sea_orm::ActiveValue::{NotSet, Set};
        misc::ActiveModel {
            edge_id: NotSet,
            u_node_id: Set(raw.u),
            v_node_id: Set(raw.v),
            misc_type: Set(raw.misc_type),
        }
    }
}

#[derive(Clone)]
pub struct MiscEdgeQuery;

impl Edge<misc::ActiveModel, misc::Model, misc::Entity> for MiscEdge {
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

impl EdgeQuery<misc::ActiveModel, misc::Model, misc::Entity, MiscEdge> for MiscEdgeQuery {
    fn get_edge_type() -> &'static str {
        "misc"
    }
}

use crate::db::entity::edge::misc;
use crate::graph::edge::{Edge, EdgeQuery, EdgeRaw};