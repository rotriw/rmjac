#[derive(Clone, Debug, PartialEq)]
pub struct PermSystemEdge {
    pub id: i64,
    pub u: i64,
    pub v: i64,
    pub perms: Vec<SystemPerm>,
}

#[derive(Clone, Debug, PartialEq)]
pub struct PermSystemEdgeRaw {
    pub u: i64,
    pub v: i64,
    pub perms: SystemPermRaw,
}

#[derive(Clone, Debug, PartialEq)]
pub enum SystemPermRaw {
    All,
    Perms(Vec<SystemPerm>),
}

#[derive(EnumConst, Copy, Clone, Debug, PartialEq, EnumIter)]
pub enum SystemPerm {
    All = -1,
    CreateProblem = 1,
    ViewAdminDashboard = 2,
    ViewSite = 4,
    Register = 8,
}

impl From<SystemPermRaw> for i32 {
    fn from(perms: SystemPermRaw) -> i32 {
        match perms {
            SystemPermRaw::All => {
                let mut res = 0;
                for i in SystemPerm::iter() {
                    if i != SystemPerm::All {
                        res |= i.get_const_isize().unwrap() as i32;
                    }
                }
                res
            }
            SystemPermRaw::Perms(perms) => {
                let mut res = 0;
                for perm in perms {
                    res |= perm.get_const_isize().unwrap() as i32;
                }
                res
            }
        }
    }
}

impl EdgeRaw<PermSystemEdge, Model, ActiveModel> for PermSystemEdgeRaw {
    fn get_edge_type(&self) -> &str {
        "perm_system"
    }

    fn get_edge_id_column(
        &self,
    ) -> <<ActiveModel as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Column {
        Column::EdgeId
    }
}

impl From<PermSystemEdgeRaw> for ActiveModel {
    fn from(raw: PermSystemEdgeRaw) -> Self {
        use sea_orm::ActiveValue::{NotSet, Set};
        use tap::Conv;
        ActiveModel {
            edge_id: NotSet,
            u_node_id: Set(raw.u),
            v_node_id: Set(raw.v),
            perm: Set(raw.perms.conv::<i32>() as i64),
        }
    }
}

impl From<Model> for PermSystemEdge {
    fn from(model: Model) -> Self {
        let perms: Perms = model.perm.into();
        PermSystemEdge {
            id: model.edge_id,
            u: model.u_node_id,
            v: model.v_node_id,
            perms: perms.0,
        }
    }
}

impl Perm for SystemPerm {}

pub struct Perms(Vec<SystemPerm>);

impl From<i64> for Perms {
    fn from(perms: i64) -> Self {
        let mut res = Vec::new();
        if perms == -1 {
            res.push(SystemPerm::All);
        } else {
            for perm in SystemPerm::iter() {
                if (perms & perm.get_const_isize().unwrap() as i64) != 0 {
                    res.push(perm);
                }
            }
        }
        Perms(res)
    }
}

impl From<Perms> for i64 {
    fn from(perms: Perms) -> i64 {
        let mut res = 0;
        for perm in perms.0 {
            res |= perm.get_const_isize().unwrap();
        }
        res as i64
    }
}

impl From<Vec<SystemPerm>> for Perms {
    fn from(perms: Vec<SystemPerm>) -> Self {
        Perms(perms)
    }
}

impl From<&[SystemPerm]> for Perms {
    fn from(perms: &[SystemPerm]) -> Self {
        Perms(perms.to_vec())
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
    async fn get_perm_v(i: i64, db: &DatabaseConnection) -> Result<Vec<(i64, i64)>> {
        use crate::db::entity::edge::perm_system::Entity as PermSystemEntity;
        use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};

        let edges = PermSystemEntity::find()
            .filter(Column::UNodeId.eq(i))
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
        use crate::db::entity::edge::perm_system::Entity as PermSystemEntity;
        use sea_orm::EntityTrait;
        let edges = PermSystemEntity::find().all(db).await?;
        Ok(edges
            .into_iter()
            .map(|edge| (edge.u_node_id, edge.v_node_id, edge.perm))
            .collect())
    }
}

use crate::Result;
use crate::db::entity::edge::perm_system::{ActiveModel, Column, Entity, Model};
use crate::graph::edge::EdgeQuery;
use crate::graph::edge::EdgeRaw;
use crate::graph::edge::{Edge, EdgeQueryPerm};
use crate::utils::perm::Perm;
use enum_const::EnumConst;
use sea_orm::DatabaseConnection;
use strum::IntoEnumIterator;
use strum_macros::EnumIter;