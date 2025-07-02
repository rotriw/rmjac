use enum_const::EnumConst;
use sea_orm::DatabaseConnection;
use crate::Result;

use crate::graph::edge::EdgeQuery;
use crate::graph::edge::EdgeRaw;
use crate::utils::perm::Perm;
use strum::IntoEnumIterator;
use strum_macros::EnumIter;

#[derive(Clone, Debug, PartialEq)]
pub struct PermViewEdge {
    pub id: i64,
    pub u: i64,
    pub v: i64,
    pub perms: Vec<ViewPerm>,
}

#[derive(Clone, Debug, PartialEq)]
pub struct PermViewEdgeRaw {
    pub u: i64,
    pub v: i64,
    pub perms: Vec<ViewPerm>,
}

#[derive(EnumConst, Copy, Clone, Debug, PartialEq, EnumIter)]
pub enum ViewPerm {
    All = -1,
    ReadProblem = 1,
    ViewPublic = 2,
    ViewPrivate = 4,
}

impl EdgeRaw<PermViewEdge, PermViewModel, PermViewActiveModel> for PermViewEdgeRaw {
    fn get_edge_type(&self) -> &str {
        "perm_view"
    }

    fn get_edge_id_column(
        &self,
    ) -> <<PermViewActiveModel as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Column
    {
        PermViewColumn::EdgeId
    }
}

impl From<PermViewEdgeRaw> for PermViewActiveModel {
    fn from(raw: PermViewEdgeRaw) -> Self {
        use sea_orm::ActiveValue::{NotSet, Set};
        PermViewActiveModel {
            edge_id: NotSet,
            u_node_id: Set(raw.u),
            v_node_id: Set(raw.v),
            perm: Set(Perms::from(raw.perms).into()),
        }
    }
}

use crate::db::entity::edge::perm_view::ActiveModel as PermViewActiveModel;
use crate::db::entity::edge::perm_view::Column as PermViewColumn;
use crate::db::entity::edge::perm_view::Model as PermViewModel;

impl From<PermViewModel> for PermViewEdge {
    fn from(model: PermViewModel) -> Self {
        let perms: Perms = model.perm.into();

        PermViewEdge {
            id: model.edge_id,
            u: model.u_node_id,
            v: model.v_node_id,
            perms: perms.0,
        }
    }
}

impl Perm for ViewPerm {}

pub struct Perms(Vec<ViewPerm>);

impl From<i64> for Perms {
    fn from(perms: i64) -> Self {
        let mut res = Vec::new();
        if perms == -1 {
            res.push(ViewPerm::All);
        } else {
            for perm in ViewPerm::iter() {
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

impl From<Vec<ViewPerm>> for Perms {
    fn from(perms: Vec<ViewPerm>) -> Self {
        Perms(perms)
    }
}

impl From<&[ViewPerm]> for Perms {
    fn from(perms: &[ViewPerm]) -> Self {
        Perms(perms.to_vec())
    }
}

pub struct PermViewEdgeQuery;

impl EdgeQuery for PermViewEdgeQuery {
    async fn get_v(u: i64, db: &DatabaseConnection) -> Result<Vec<i64>> {
        use crate::db::entity::edge::perm_view::Entity as PermViewEntity;
        use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};

        let edges = PermViewEntity::find()
            .filter(PermViewColumn::UNodeId.eq(u))
            .all(db)
            .await?;
        Ok(edges.into_iter().map(|edge| edge.v_node_id).collect())
    }

    async fn get_perm_v(i: i64, db: &DatabaseConnection) -> Result<Vec<(i64, i64)>> {
        use crate::db::entity::edge::perm_view::Entity as PermViewEntity;
        use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};

        let edges = PermViewEntity::find()
            .filter(PermViewColumn::UNodeId.eq(i))
            .all(db)
            .await?;
        Ok(edges.into_iter().map(|edge| (edge.v_node_id, edge.perm)).collect())
    }

    fn get_edge_type() -> &'static str {
        "perm_view"
    }
}