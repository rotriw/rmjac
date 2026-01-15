use crate::Result;
use crate::db::entity::edge::perm_pages::{ActiveModel, Column, Entity, Model};
use crate::graph::edge::{Edge, EdgeQuery, EdgeQueryPerm, EdgeRaw, FromTwoTuple};
use crate::utils::perm::{Perm, PermImport, PermValue};
use enum_const::EnumConst;
use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter};
use serde::{Deserialize, Serialize};
use strum::IntoEnumIterator;
use strum_macros::EnumIter;

// 先定义 PagesPerm 枚举
#[derive(
    EnumConst, Copy, Clone, Debug, PartialEq, EnumIter, Serialize, Deserialize, ts_rs::TS,
)]
#[ts(export)]
pub enum PagesPerm {
    ReadPages = 1,
    EditPages = 2,
    DeletePages = 4,
    ManagePagesPermissions = 8,
    PublishPages = 16,
}

impl From<PagesPerm> for i64 {
    fn from(perm: PagesPerm) -> i64 {
        perm.get_const_isize().unwrap() as i64
    }
}

// 在使用 Perm<PagesPerm> 之前实现 PermValue
impl PermValue for PagesPerm {}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct PermPagesEdge {
    pub id: i64,
    pub u: i64,
    pub v: i64,
    pub perms: Perm<PagesPerm>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct PermPagesEdgeRaw {
    pub u: i64,
    pub v: i64,
    pub perms: PagesPermRaw,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub enum PagesPermRaw {
    All,
    Perms(Vec<PagesPerm>),
}

impl From<PagesPermRaw> for i64 {
    fn from(perms: PagesPermRaw) -> i64 {
        match perms {
            PagesPermRaw::All => {
                let mut res = 0i64;
                for i in PagesPerm::iter() {
                    res |= i.get_const_isize().unwrap() as i64;
                }
                res
            }
            PagesPermRaw::Perms(perms) => {
                let mut res = 0i64;
                for perm in perms {
                    res |= perm.get_const_isize().unwrap() as i64;
                }
                res
            }
        }
    }
}

impl From<PagesPermRaw> for Perm<PagesPerm> {
    fn from(raw: PagesPermRaw) -> Self {
        match raw {
            PagesPermRaw::All => {
                let all_perms: Vec<PagesPerm> = PagesPerm::iter().collect();
                Perm::import_from_perms(all_perms)
            }
            PagesPermRaw::Perms(perms) => Perm::import_from_perms(perms),
        }
    }
}

impl EdgeRaw<PermPagesEdge, Model, ActiveModel> for PermPagesEdgeRaw {
    fn get_edge_type(&self) -> &str {
        "perm_pages"
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

impl From<PermPagesEdgeRaw> for ActiveModel {
    fn from(raw: PermPagesEdgeRaw) -> Self {
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

impl From<Model> for PermPagesEdge {
    fn from(model: Model) -> Self {
        let perms: Perm<PagesPerm> = Perm::import_from_value(model.perm);
        PermPagesEdge {
            id: model.edge_id,
            u: model.u_node_id,
            v: model.v_node_id,
            perms,
        }
    }
}

impl From<(i64, i64, i64)> for PermPagesEdgeRaw {
    fn from(tuple: (i64, i64, i64)) -> Self {
        PermPagesEdgeRaw {
            u: tuple.0,
            v: tuple.1,
            perms: PagesPermRaw::Perms(vec![]),
        }
    }
}

impl FromTwoTuple for PermPagesEdge {
    async fn from_tuple(tuple: (i64, i64), db: &DatabaseConnection) -> Self {
        let (u, v) = tuple;
        let model = Entity::find()
            .filter(Column::UNodeId.eq(u))
            .filter(Column::VNodeId.eq(v))
            .one(db)
            .await
            .unwrap();
        match model {
            Some(m) => PermPagesEdge::from(m),
            None => PermPagesEdge {
                id: 0,
                u,
                v,
                perms: Perm::import_from_value(0),
            },
        }
    }
}

impl Into<(i64, i64, i64)> for PermPagesEdge {
    fn into(self) -> (i64, i64, i64) {
        (self.u, self.v, self.perms.get_value())
    }
}

#[derive(Clone, Debug, PartialOrd, PartialEq)]
pub struct PermPagesEdgeQuery;

impl Edge<ActiveModel, Model, Entity> for PermPagesEdge {
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

impl EdgeQuery<ActiveModel, Model, Entity, PermPagesEdge> for PermPagesEdgeQuery {
    fn get_edge_type() -> &'static str {
        "perm_pages"
    }
}

impl EdgeQueryPerm for PermPagesEdgeQuery {
    async fn get_perm_v(u: i64, db: &DatabaseConnection) -> Result<Vec<(i64, i64)>> {
        let edges = Entity::find().filter(Column::UNodeId.eq(u)).all(db).await?;
        Ok(edges
            .into_iter()
            .map(|edge| (edge.v_node_id, edge.perm))
            .collect())
    }

    fn get_perm_iter() -> impl Iterator<Item = i64> {
        PagesPerm::iter().map(|perm| perm.get_const_isize().unwrap() as i64)
    }

    async fn get_all(db: &DatabaseConnection) -> Result<Vec<(i64, i64, i64)>> {
        let edges = Entity::find().all(db).await?;
        Ok(edges
            .into_iter()
            .map(|edge| (edge.u_node_id, edge.v_node_id, edge.perm))
            .collect())
    }
}
