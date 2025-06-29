use crate::{
    db::entity::edge::{self, perm_manage},
    graph::edge::EdgeRaw,
    Result,
};
use enum_const::EnumConst;
use sea_orm::DatabaseConnection;
use strum::IntoEnumIterator;
use strum_macros::EnumIter;

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
    pub perms: Vec<ManagePerm>,
}

#[derive(EnumConst, Copy, Clone, Debug, PartialEq, EnumIter)]
pub enum ManagePerm {
    All = -1,
    ManageStatement = 1,
    ManageEdge = 2,
    ManagePublicDescription = 4,
    ManagePrivateDescription = 8,
}

impl EdgeRaw<PermManageEdge, perm_manage::Model, perm_manage::ActiveModel> for PermManageEdgeRaw {
    fn get_edge_type(&self) -> &str {
        "perm_manage"
    }

    fn get_edge_id_column(&self) ->  <<perm_manage::ActiveModel as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Column{
        perm_manage::Column::EdgeId
    }
}

impl From<PermManageEdgeRaw> for perm_manage::ActiveModel {
    fn from(raw: PermManageEdgeRaw) -> Self {
        use sea_orm::ActiveValue::{NotSet, Set};
        perm_manage::ActiveModel {
            edge_id: NotSet,
            u_node_id: Set(raw.u),
            v_node_id: Set(raw.v),
            perm: Set(Perms::from(raw.perms).into()),
        }
    }
}

impl From<perm_manage::Model> for PermManageEdge {
    fn from(model: perm_manage::Model) -> Self {
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
