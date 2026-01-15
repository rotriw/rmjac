use crate::Result;
use crate::db::entity::edge::perm_system::{ActiveModel, Column, Entity, Model};
use crate::graph::edge::{Edge, EdgeQuery, EdgeQueryPerm, EdgeRaw, FromTwoTuple};
use crate::utils::perm::{Perm, PermImport, PermValue};
use enum_const::EnumConst;
use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter};
use serde::{Deserialize, Serialize};
use strum::IntoEnumIterator;
use strum_macros::EnumIter;

// 先定义 SystemPerm 枚举
#[derive(
    EnumConst, Copy, Clone, Debug, PartialEq, EnumIter, Serialize, Deserialize, ts_rs::TS,
)]
#[ts(export)]
pub enum SystemPerm {
    All = -1,
    CreateProblem = 1,
    ViewAdminDashboard = 2,
    ViewSite = 4,
    Register = 8,
    ProblemManage = 16,
    CreateTraining = 32,
    ManageAllTraining = 64,
    CreateRecord = 128,
    ManageVjudge = 256,
    ManageAllUser = 512,
}

impl From<SystemPerm> for i64 {
    fn from(perm: SystemPerm) -> i64 {
        perm.get_const_isize().unwrap() as i64
    }
}

// 在使用 Perm<SystemPerm> 之前实现 PermValue
impl PermValue for SystemPerm {}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct PermSystemEdge {
    pub id: i64,
    pub u: i64,
    pub v: i64,
    pub perms: Perm<SystemPerm>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct PermSystemEdgeRaw {
    pub u: i64,
    pub v: i64,
    pub perms: SystemPermRaw,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub enum SystemPermRaw {
    All,
    Perms(Vec<SystemPerm>),
}

impl From<SystemPermRaw> for i64 {
    fn from(perms: SystemPermRaw) -> i64 {
        match perms {
            SystemPermRaw::All => {
                let mut res = 0i64;
                for i in SystemPerm::iter() {
                    if i != SystemPerm::All {
                        res |= i.get_const_isize().unwrap() as i64;
                    }
                }
                res
            }
            SystemPermRaw::Perms(perms) => {
                let mut res = 0i64;
                for perm in perms {
                    res |= perm.get_const_isize().unwrap() as i64;
                }
                res
            }
        }
    }
}

impl From<SystemPermRaw> for Perm<SystemPerm> {
    fn from(raw: SystemPermRaw) -> Self {
        match raw {
            SystemPermRaw::All => {
                let all_perms: Vec<SystemPerm> = SystemPerm::iter()
                    .filter(|p| *p != SystemPerm::All)
                    .collect();
                Perm::import_from_perms(all_perms)
            }
            SystemPermRaw::Perms(perms) => Perm::import_from_perms(perms),
        }
    }
}

impl EdgeRaw<PermSystemEdge, Model, ActiveModel> for PermSystemEdgeRaw {
    fn get_edge_type(&self) -> &str {
        "perm_system"
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

impl From<PermSystemEdgeRaw> for ActiveModel {
    fn from(raw: PermSystemEdgeRaw) -> Self {
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

impl From<Model> for PermSystemEdge {
    fn from(model: Model) -> Self {
        let perms: Perm<SystemPerm> = Perm::import_from_value(model.perm);
        PermSystemEdge {
            id: model.edge_id,
            u: model.u_node_id,
            v: model.v_node_id,
            perms,
        }
    }
}

impl From<(i64, i64, i64)> for PermSystemEdgeRaw {
    fn from(tuple: (i64, i64, i64)) -> Self {
        PermSystemEdgeRaw {
            u: tuple.0,
            v: tuple.1,
            perms: SystemPermRaw::Perms(vec![]),  // Will be populated from perm value
        }
    }
}

impl FromTwoTuple for PermSystemEdge {
    async fn from_tuple(tuple: (i64, i64), db: &DatabaseConnection) -> Self {
        let (u, v) = tuple;
        let model = Entity::find()
            .filter(Column::UNodeId.eq(u))
            .filter(Column::VNodeId.eq(v))
            .one(db)
            .await
            .unwrap();
        match model {
            Some(m) => PermSystemEdge::from(m),
            None => PermSystemEdge {
                id: 0,
                u,
                v,
                perms: Perm::import_from_value(0),
            },
        }
    }
}

impl Into<(i64, i64, i64)> for PermSystemEdge {
    fn into(self) -> (i64, i64, i64) {
        (self.u, self.v, self.perms.get_value())
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct PermSystemEdgeQuery;

impl Edge<ActiveModel, Model, Entity> for PermSystemEdge {
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

impl EdgeQuery<ActiveModel, Model, Entity, PermSystemEdge> for PermSystemEdgeQuery {
    fn get_edge_type() -> &'static str {
        "perm_system"
    }
}

impl EdgeQueryPerm for PermSystemEdgeQuery {
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
        SystemPerm::iter().map(|perm| perm.get_const_isize().unwrap() as i64)
    }

    async fn get_all(db: &DatabaseConnection) -> Result<Vec<(i64, i64, i64)>> {
        let edges = Entity::find().all(db).await?;
        Ok(edges
            .into_iter()
            .map(|edge| (edge.u_node_id, edge.v_node_id, edge.perm))
            .collect())
    }
}
