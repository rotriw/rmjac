use crate::Result;
use crate::db::entity::edge::perm_problem::{ActiveModel, Column, Entity, Model};
use crate::graph::edge::{Edge, EdgeQuery, EdgeQueryPerm, EdgeRaw, FromTwoTuple};
use crate::utils::perm::{Perm, PermImport, PermValue};
use enum_const::EnumConst;
use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter};
use serde::{Deserialize, Serialize};
use strum::IntoEnumIterator;
use strum_macros::EnumIter;

// 先定义 ProblemPerm 枚举
#[derive(
    EnumConst, Copy, Clone, Debug, PartialEq, EnumIter, Serialize, Deserialize, ts_rs::TS,
)]
#[ts(export)]
pub enum ProblemPerm {
    All = -1,
    ReadProblem = 1,
    EditProblem = 2,
    DeleteProblem = 4,
    OwnProblem = 8,
}

impl From<ProblemPerm> for i64 {
    fn from(perm: ProblemPerm) -> i64 {
        perm.get_const_isize().unwrap() as i64
    }
}

// 在使用 Perm<ProblemPerm> 之前实现 PermValue
impl PermValue for ProblemPerm {}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct PermProblemEdge {
    pub id: i64,
    pub u: i64,
    pub v: i64,
    pub perms: Perm<ProblemPerm>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct PermProblemEdgeRaw {
    pub u: i64,
    pub v: i64,
    pub perms: ProblemPermRaw,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub enum ProblemPermRaw {
    All,
    Perms(Vec<ProblemPerm>),
}

impl From<ProblemPermRaw> for i64 {
    fn from(perms: ProblemPermRaw) -> i64 {
        match perms {
            ProblemPermRaw::All => {
                let mut res = 0i64;
                for i in ProblemPerm::iter() {
                    if i != ProblemPerm::All {
                        res |= i.get_const_isize().unwrap() as i64;
                    }
                }
                res
            }
            ProblemPermRaw::Perms(perms) => {
                let mut res = 0i64;
                for perm in perms {
                    res |= perm.get_const_isize().unwrap() as i64;
                }
                res
            }
        }
    }
}

impl From<ProblemPermRaw> for Perm<ProblemPerm> {
    fn from(raw: ProblemPermRaw) -> Self {
        match raw {
            ProblemPermRaw::All => {
                let all_perms: Vec<ProblemPerm> = ProblemPerm::iter()
                    .filter(|p| *p != ProblemPerm::All)
                    .collect();
                Perm::import_from_perms(all_perms)
            }
            ProblemPermRaw::Perms(perms) => Perm::import_from_perms(perms),
        }
    }
}

impl EdgeRaw<PermProblemEdge, Model, ActiveModel> for PermProblemEdgeRaw {
    fn get_edge_type(&self) -> &str {
        "perm_problem"
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

impl From<PermProblemEdgeRaw> for ActiveModel {
    fn from(raw: PermProblemEdgeRaw) -> Self {
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

impl From<Model> for PermProblemEdge {
    fn from(model: Model) -> Self {
        let perms: Perm<ProblemPerm> = Perm::import_from_value(model.perm);
        PermProblemEdge {
            id: model.edge_id,
            u: model.u_node_id,
            v: model.v_node_id,
            perms,
        }
    }
}

impl From<(i64, i64, i64)> for PermProblemEdgeRaw {
    fn from(tuple: (i64, i64, i64)) -> Self {
        PermProblemEdgeRaw {
            u: tuple.0,
            v: tuple.1,
            perms: ProblemPermRaw::Perms(vec![]),
        }
    }
}

impl FromTwoTuple for PermProblemEdge {
    async fn from_tuple(tuple: (i64, i64), db: &DatabaseConnection) -> Self {
        let (u, v) = tuple;
        let model = Entity::find()
            .filter(Column::UNodeId.eq(u))
            .filter(Column::VNodeId.eq(v))
            .one(db)
            .await
            .unwrap();
        match model {
            Some(m) => PermProblemEdge::from(m),
            None => PermProblemEdge {
                id: 0,
                u,
                v,
                perms: Perm::import_from_value(0),
            },
        }
    }
}

impl Into<(i64, i64, i64)> for PermProblemEdge {
    fn into(self) -> (i64, i64, i64) {
        (self.u, self.v, self.perms.get_value())
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct PermProblemEdgeQuery;

impl Edge<ActiveModel, Model, Entity> for PermProblemEdge {
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

impl EdgeQuery<ActiveModel, Model, Entity, PermProblemEdge> for PermProblemEdgeQuery {
    fn get_edge_type() -> &'static str {
        "perm_problem"
    }
}

impl EdgeQueryPerm for PermProblemEdgeQuery {
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
        ProblemPerm::iter().map(|perm| perm.get_const_isize().unwrap() as i64)
    }

    async fn get_all(db: &DatabaseConnection) -> Result<Vec<(i64, i64, i64)>> {
        let edges = Entity::find().all(db).await?;
        Ok(edges
            .into_iter()
            .map(|edge| (edge.u_node_id, edge.v_node_id, edge.perm))
            .collect())
    }
}
