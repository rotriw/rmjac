#[derive(Clone, Debug, PartialEq)]
pub struct UserRemoteEdge {
    pub id: i64,
    pub u: i64,
    pub v: i64,
}

#[derive(Clone, Debug, PartialEq)]
pub struct UserRemoteEdgeRaw {
    pub u: i64,
    pub v: i64,
}

impl EdgeRaw<UserRemoteEdge, Model, ActiveModel> for UserRemoteEdgeRaw {
    fn get_edge_type(&self) -> &str {
        "user_remote"
    }
    fn get_edge_id_column(
        &self,
    ) -> <<ActiveModel as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Column {
        Column::EdgeId
    }
}

impl From<UserRemoteEdgeRaw> for ActiveModel {
    fn from(raw: UserRemoteEdgeRaw) -> Self {
        ActiveModel {
            edge_id: NotSet,
            u_node_id: Set(raw.u),
            v_node_id: Set(raw.v),
        }
    }
}

impl Edge<ActiveModel, Model, Entity> for UserRemoteEdge {
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


#[derive(Clone, Debug, PartialEq)]
pub struct UserRemoteEdgeQuery;

impl EdgeQuery<ActiveModel, Model, Entity, UserRemoteEdge> for UserRemoteEdgeQuery {
    fn get_edge_type() -> &'static str {
        "user_remote"
    }
}

use sea_orm::ActiveValue::{NotSet, Set};
use crate::{db::entity::edge::user_remote::{ActiveModel, Column, Entity, Model}, graph::edge::{Edge, EdgeQuery, EdgeRaw}};