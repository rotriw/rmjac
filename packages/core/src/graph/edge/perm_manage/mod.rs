#[derive(Clone, Debug, PartialEq)]
pub struct PermManageEdge {
    pub id: i64,
    pub u: i64,
    pub v: i64,
    pub perms: Vec<ManagePerm>,
}

#[derive(Clone, Debug, PartialEq)]
pub struct PermManageEdgeRaw {
    pub u: i64,
    pub v: i64,
    pub perms: ManagePermRaw,
}

#[derive(EnumConst, Copy, Clone, Debug, PartialEq, EnumIter)]
pub enum ManagePerm {
    ManageStatement = 1,
    ManageEdge = 2,
    ManagePublicDescription = 4,
    ManagePrivateDescription = 8,
}

#[derive(Clone, Debug, PartialEq)]
pub enum ManagePermRaw {
    All,
    Perms(Vec<ManagePerm>),
}

impl From<ManagePermRaw> for i32 {
    fn from(perms: ManagePermRaw) -> i32 {
        match perms {
            ManagePermRaw::All => {
                let mut res = 0;
                for i in ManagePerm::iter() {
                    res |= i.get_const_isize().unwrap() as i32;
                }
                res
            }
            ManagePermRaw::Perms(perms) => {
                let mut res = 0;
                for perm in perms {
                    res |= perm.get_const_isize().unwrap() as i32;
                }
                res
            }
        }
    }
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
}

impl From<PermManageEdgeRaw> for ActiveModel {
    fn from(raw: PermManageEdgeRaw) -> Self {
        use sea_orm::ActiveValue::{NotSet, Set};
        ActiveModel {
            edge_id: NotSet,
            u_node_id: Set(raw.u),
            v_node_id: Set(raw.v),
            perm: Set(raw.perms.conv::<i32>() as i64),
        }
    }
}

impl From<Model> for PermManageEdge {
    fn from(model: Model) -> Self {
        let perms: Perms = model.perm.into();
        PermManageEdge {
            id: model.edge_id,
            u: model.u_node_id,
            v: model.v_node_id,
            perms: perms.0,
        }
    }
}

impl From<i64> for Perms {
    fn from(perm: i64) -> Self {
        let mut perms = Vec::new();
        for p in ManagePerm::iter() {
            if perm & p.get_const_isize().unwrap() as i64 != 0 {
                perms.push(p);
            }
        }
        Perms(perms)
    }
}

pub struct Perms(Vec<ManagePerm>);

impl From<Perms> for i64 {
    fn from(perms: Perms) -> i64 {
        let mut res = 0;
        for perm in perms.0 {
            res |= perm.get_const_isize().unwrap();
        }
        res as i64
    }
}

impl From<Vec<ManagePerm>> for Perms {
    fn from(perms: Vec<ManagePerm>) -> Self {
        Perms(perms)
    }
}

impl From<&[ManagePerm]> for Perms {
    fn from(perms: &[ManagePerm]) -> Self {
        Perms(perms.to_vec())
    }
}

#[derive(Clone, Debug, PartialOrd, PartialEq)]
pub struct PermManageEdgeQuery;

impl Edge<ActiveModel, Model, Entity> for PermManageEdge {
    fn get_edge_id(&self) -> i64 {
        self.id
    }
}

impl EdgeQuery<ActiveModel, Model, Entity, PermManageEdge> for PermManageEdgeQuery {
    fn get_edge_type() -> &'static str {
        "perm_manage"
    }
}

impl EdgeQueryPerm for PermManageEdgeQuery {
    async fn get_perm_v(u: i64, db: &DatabaseConnection) -> Result<Vec<(i64, i64)>> {
        let edges = Entity::find().filter(Column::UNodeId.eq(u)).all(db).await?;
        Ok(edges
            .into_iter()
            .map(|edge| (edge.v_node_id, edge.perm.into()))
            .collect())
    }
}

use crate::db::entity::edge::perm_manage::{ActiveModel, Column, Entity, Model};
use crate::graph::edge::{Edge, EdgeQuery, EdgeQueryPerm, EdgeRaw};
use crate::Result;
use enum_const::EnumConst;
use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter};
use strum::IntoEnumIterator;
use strum_macros::EnumIter;
use tap::Conv;
