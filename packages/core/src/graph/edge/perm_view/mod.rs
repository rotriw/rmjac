use enum_const::EnumConst;

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

    fn get_edge_id_column(&self) -> <<PermViewActiveModel as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Column{
        PermViewColumn::EdgeId
    }
}

impl From<PermViewEdgeRaw> for PermViewActiveModel {
    fn from(raw: PermViewEdgeRaw) -> Self {
        use sea_orm::ActiveValue::{Set, NotSet};
        PermViewActiveModel {
            edge_id: NotSet,
            u_node_id: Set(raw.u),
            v_node_id: Set(raw.v),
            perm: Set(Perms::from(raw.perms).into()),
        }
    }
}

use crate::db::entity::edge::perm_view::Model as PermViewModel;
use crate::db::entity::edge::perm_view::ActiveModel as PermViewActiveModel;
use crate::db::entity::edge::perm_view::Column as PermViewColumn;

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
