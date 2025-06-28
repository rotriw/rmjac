use crate::db::entity::edge::edge::create_edge;
use crate::db::entity::edge::Perm;
use crate::error::CoreError;
use enum_const::EnumConst;
use sea_orm::entity::prelude::*;
use sea_orm::ActiveValue::Set;
use sea_orm::{DeriveEntityModel, DeriveRelation, EnumIter, FromJsonQueryResult};
use serde::{Deserialize, Serialize};
use tap::Conv;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "edge_perm_manage")]
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
pub enum ManagePerm {
    All = -1,
    ManageStatement = 1,
    ManageEdge = 2,
    ManagePublicDescription = 4,
    ManagePrivateDescription = 8,
}

impl Perm for ManagePerm {}

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

pub async fn new_perm_manage_edge<T: Into<Perms>>(
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

pub async fn query_u_perm_manage_edges(
    db: &DatabaseConnection,
    u_node_id: i64,
) -> Result<Vec<Model>, CoreError> {
    let edges = Entity::find()
        .filter(Column::UNodeId.eq(u_node_id))
        .all(db)
        .await?;
    Ok(edges)
}

pub async fn query_v_perm_manage_edges(
    db: &DatabaseConnection,
    v_node_id: i64,
) -> Result<Vec<Model>, CoreError> {
    let edges = Entity::find()
        .filter(Column::VNodeId.eq(v_node_id))
        .all(db)
        .await?;
    Ok(edges)
}