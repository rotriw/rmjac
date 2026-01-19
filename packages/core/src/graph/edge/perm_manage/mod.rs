use crate::db::entity::edge::perm_manage::{ActiveModel, Column, Entity, Model};
use crate::graph::edge::{Edge, EdgeRaw, FromTwoTuple};
use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter};
use serde::{Deserialize, Serialize};
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct PermManageEdge {
    pub id: i64,
    pub u: i64,
    pub v: i64,
    pub perms: i64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct PermManageEdgeRaw {
    pub u: i64,
    pub v: i64,
    pub perms: i64,
}


impl EdgeRaw<PermManageEdge, Model, ActiveModel> for PermManageEdgeRaw {
    fn get_edge_type(&self) -> &str {
        "perm_manage"
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

impl From<PermManageEdgeRaw> for ActiveModel {
    fn from(raw: PermManageEdgeRaw) -> Self {
        use sea_orm::ActiveValue::{NotSet, Set};
        ActiveModel {
            edge_id: NotSet,
            u_node_id: Set(raw.u),
            v_node_id: Set(raw.v),
            perm: Set(raw.perms),
        }
    }
}

impl From<Model> for PermManageEdge {
    fn from(model: Model) -> Self {
        PermManageEdge {
            id: model.edge_id,
            u: model.u_node_id,
            v: model.v_node_id,
            perms: model.perm,
        }
    }
}

impl From<(i64, i64, i64)> for PermManageEdgeRaw {
    fn from(tuple: (i64, i64, i64)) -> Self {
        PermManageEdgeRaw {
            u: tuple.0,
            v: tuple.1,
            perms: tuple.2,
        }
    }
}

impl FromTwoTuple for PermManageEdge {
    async fn from_tuple(tuple: (i64, i64), db: &DatabaseConnection) -> Self {
        let (u, v) = tuple;
        let model = Entity::find()
            .filter(Column::UNodeId.eq(u))
            .filter(Column::VNodeId.eq(v))
            .one(db)
            .await
            .unwrap();
        match model {
            Some(m) => PermManageEdge::from(m),
            None => PermManageEdge {
                id: 0,
                u,
                v,
                perms: 0,
            },
        }
    }
}

impl Into<(i64, i64, i64)> for PermManageEdge {
    fn into(self) -> (i64, i64, i64) {
        (self.u, self.v, self.perms)
    }
}

impl Edge<ActiveModel, Model, Entity> for PermManageEdge {
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