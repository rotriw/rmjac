use crate::db::entity::edge::edge::create_edge;
use crate::error::CoreError;
use enum_const::EnumConst;
use sea_orm::entity::prelude::*;
use sea_orm::ActiveValue::Set;
use sea_orm::{DeriveEntityModel, DeriveRelation, EnumIter, FromJsonQueryResult};
use serde::{Deserialize, Serialize};
use tap::Conv;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "edge_perm_view")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub edge_id: i64,
    pub u_node_id: i64,
    pub v_node_id: i64,
    pub perm: i64,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

#[derive(EnumConst, Copy, Clone, Debug, PartialEq)]
pub enum ViewPerm {
    All = -1,
    ReadProblem = 1,
    ViewPublic = 2,
    ViewPrivate = 4,
}

pub struct Perms(Vec<ViewPerm>);

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

pub async fn new_perm_view_edge<T: Into<Perms>>(
    db: &DatabaseConnection,
    edge_type: &str,
    u_id: i64,
    v_id: i64,
    perms: T,
) -> Result<Model, CoreError> {
    let edge = create_edge(db, edge_type).await?;
    let perm_view = ActiveModel {
        edge_id: Set(edge.edge_id),
        u_node_id: Set(u_id),
        v_node_id: Set(v_id),
        perm: Set(perms.into().into()),
    };
    let edge = perm_view.insert(db).await?;
    Ok(edge)
}
