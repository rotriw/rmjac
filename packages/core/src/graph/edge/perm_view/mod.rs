use crate::db::entity::edge::perm_view::{ActiveModel, Column, Entity, Model};
use crate::graph::edge::{Edge, EdgeRaw, FromTwoTuple};
use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter};
use serde::{Deserialize, Serialize};
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct PermViewEdge {
    pub id: i64,
    pub u: i64,
    pub v: i64,
    pub perms: i64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct PermViewEdgeRaw {
    pub u: i64,
    pub v: i64,
    pub perms: i64,
}


impl EdgeRaw<PermViewEdge, Model, ActiveModel> for PermViewEdgeRaw {
    fn get_edge_type(&self) -> &str {
        "perm_view"
    }

    fn get_edge_id_column(
        &self,
    ) -> <<ActiveModel as sea_orm::ActiveModelTrait>::Entity as EntityTrait>::Column {
        Column::EdgeId
    }

    fn get_u_node_id(&self) -> i64 {
        self.u
    }

    fn get_v_node_id(&self) -> i64 {
        self.v
    }

}

impl From<PermViewEdgeRaw> for ActiveModel {
    fn from(raw: PermViewEdgeRaw) -> Self {
        use sea_orm::ActiveValue::{NotSet, Set};
        ActiveModel {
            edge_id: NotSet,
            u_node_id: Set(raw.u),
            v_node_id: Set(raw.v),
            perm: Set(raw.perms),
        }
    }
}

impl From<Model> for PermViewEdge {
    fn from(model: Model) -> Self {
        PermViewEdge {
            id: model.edge_id,
            u: model.u_node_id,
            v: model.v_node_id,
            perms: model.perm,
        }
    }
}

impl From<(i64, i64, i64)> for PermViewEdgeRaw {
    fn from(tuple: (i64, i64, i64)) -> Self {
        PermViewEdgeRaw {
            u: tuple.0,
            v: tuple.1,
            perms: tuple.2,
        }
    }
}

impl FromTwoTuple for PermViewEdge {
    async fn from_tuple(tuple: (i64, i64), db: &DatabaseConnection) -> Self {
        let (u, v) = tuple;
        let model = Entity::find()
            .filter(Column::UNodeId.eq(u))
            .filter(Column::VNodeId.eq(v))
            .one(db)
            .await
            .unwrap();
        match model {
            Some(m) => PermViewEdge::from(m),
            None => PermViewEdge {
                id: 0,
                u,
                v,
                perms: 0,
            },
        }
    }
}

impl Into<(i64, i64, i64)> for PermViewEdge {
    fn into(self) -> (i64, i64, i64) {
        (self.u, self.v, self.perms)
    }
}

impl Edge<ActiveModel, Model, Entity> for PermViewEdge {
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

pub type PermViewEdgeQuery = crate::graph::edge::EdgeQueryTool<ActiveModel, Model, Entity, PermViewEdge>;
