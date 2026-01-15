use crate::Result;
use crate::db::entity::edge::perm_view::{ActiveModel, Column, Entity, Model};
use crate::graph::edge::{Edge, EdgeQuery, EdgeQueryPerm, EdgeRaw, FromTwoTuple};
use crate::utils::perm::{Perm, PermImport, PermValue};
use enum_const::EnumConst;
use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter};
use serde::{Deserialize, Serialize};
use strum::IntoEnumIterator;
use strum_macros::EnumIter;

// 先定义 ViewPerm 枚举
#[derive(
    EnumConst, Copy, Clone, Debug, PartialEq, EnumIter, Serialize, Deserialize, ts_rs::TS,
)]
#[ts(export)]
pub enum ViewPerm {
    All = -1,
    ReadProblem = 1,
    ViewPublic = 2,
    ViewPrivate = 4,
}

impl From<ViewPerm> for i64 {
    fn from(perm: ViewPerm) -> i64 {
        perm.get_const_isize().unwrap() as i64
    }
}

// 在使用 Perm<ViewPerm> 之前实现 PermValue
impl PermValue for ViewPerm {}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct PermViewEdge {
    pub id: i64,
    pub u: i64,
    pub v: i64,
    pub perms: Perm<ViewPerm>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct PermViewEdgeRaw {
    pub u: i64,
    pub v: i64,
    pub perms: ViewPermRaw,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub enum ViewPermRaw {
    All,
    Perms(Vec<ViewPerm>),
}

impl From<ViewPermRaw> for i64 {
    fn from(perms: ViewPermRaw) -> i64 {
        match perms {
            ViewPermRaw::All => {
                let mut res = 0i64;
                for i in ViewPerm::iter() {
                    if i != ViewPerm::All {
                        res |= i.get_const_isize().unwrap() as i64;
                    }
                }
                res
            }
            ViewPermRaw::Perms(perms) => {
                let mut res = 0i64;
                for perm in perms {
                    res |= perm.get_const_isize().unwrap() as i64;
                }
                res
            }
        }
    }
}

impl From<ViewPermRaw> for Perm<ViewPerm> {
    fn from(raw: ViewPermRaw) -> Self {
        match raw {
            ViewPermRaw::All => {
                let all_perms: Vec<ViewPerm> = ViewPerm::iter()
                    .filter(|p| *p != ViewPerm::All)
                    .collect();
                Perm::import_from_perms(all_perms)
            }
            ViewPermRaw::Perms(perms) => Perm::import_from_perms(perms),
        }
    }
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
        let perm_value: i64 = raw.perms.into();
        ActiveModel {
            edge_id: NotSet,
            u_node_id: Set(raw.u),
            v_node_id: Set(raw.v),
            perm: Set(perm_value),
        }
    }
}

impl From<Model> for PermViewEdge {
    fn from(model: Model) -> Self {
        let perms: Perm<ViewPerm> = Perm::import_from_value(model.perm);
        PermViewEdge {
            id: model.edge_id,
            u: model.u_node_id,
            v: model.v_node_id,
            perms,
        }
    }
}

impl From<(i64, i64, i64)> for PermViewEdgeRaw {
    fn from(tuple: (i64, i64, i64)) -> Self {
        PermViewEdgeRaw {
            u: tuple.0,
            v: tuple.1,
            perms: ViewPermRaw::Perms(vec![]),
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
                perms: Perm::import_from_value(0),
            },
        }
    }
}

impl Into<(i64, i64, i64)> for PermViewEdge {
    fn into(self) -> (i64, i64, i64) {
        (self.u, self.v, self.perms.get_value())
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct PermViewEdgeQuery;

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

impl EdgeQuery<ActiveModel, Model, Entity, PermViewEdge> for PermViewEdgeQuery {
    fn get_edge_type() -> &'static str {
        "perm_view"
    }
}

impl EdgeQueryPerm for PermViewEdgeQuery {
    async fn get_perm_v(u: i64, db: &DatabaseConnection) -> Result<Vec<(i64, i64)>> {
        let edges = Entity::find()
            .filter(Column::UNodeId.eq(u))
            .all(db)
            .await?;
        Ok(edges
            .into_iter()
            .map(|edge| (edge.v_node_id, edge.perm))
            .collect())
    }

    fn get_perm_iter() -> impl Iterator<Item = i64> {
        ViewPerm::iter().map(|perm| perm.get_const_isize().unwrap() as i64)
    }

    async fn get_all(db: &DatabaseConnection) -> Result<Vec<(i64, i64, i64)>> {
        let edges = Entity::find().all(db).await?;
        Ok(edges
            .into_iter()
            .map(|edge| (edge.u_node_id, edge.v_node_id, edge.perm))
            .collect())
    }
}
