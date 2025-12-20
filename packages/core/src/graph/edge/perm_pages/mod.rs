#[derive(Clone, Debug, PartialEq)]
pub struct PermPagesEdge {
    pub id: i64,
    pub u: i64,
    pub v: i64,
    pub perms: Vec<PagesPerm>,
}

#[derive(Clone, Debug, PartialEq)]
pub struct PermPagesEdgeRaw {
    pub u: i64,
    pub v: i64,
    pub perms: PagesPermRaw,
}

#[derive(EnumConst, Copy, Clone, Debug, PartialEq, EnumIter)]
pub enum PagesPerm {
    ReadPages = 1,
    EditPages = 2,
    DeletePages = 4,
    ManagePagesPermissions = 8,
    PublishPages = 16,
}

#[derive(Clone, Debug, PartialEq)]
pub enum PagesPermRaw {
    All,
    Perms(Vec<PagesPerm>),
}

impl From<PagesPermRaw> for i32 {
    fn from(perms: PagesPermRaw) -> i32 {
        match perms {
            PagesPermRaw::All => {
                let mut res = 0;
                for i in PagesPerm::iter() {
                    res |= i.get_const_isize().unwrap() as i32;
                }
                res
            }
            PagesPermRaw::Perms(perms) => {
                let mut res = 0;
                for perm in perms {
                    res |= perm.get_const_isize().unwrap() as i32;
                }
                res
            }
        }
    }
}

impl EdgeRaw<PermPagesEdge, Model, ActiveModel> for PermPagesEdgeRaw {
    fn get_edge_type(&self) -> &str {
        "perm_pages"
    }

    fn get_edge_id_column(
        &self,
    ) -> <<ActiveModel as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Column {
        Column::EdgeId
    }

    fn get_u_node_id(&self) -> i64 {
        self.u
    }

    fn get_v_node_id(&self) -> i64 {
        self.v
    }
    
    fn get_perm_value(&self) -> Option<i64> {
        use tap::Conv;
        Some(self.perms.clone().conv::<i32>() as i64)
    }
}

impl From<PermPagesEdgeRaw> for ActiveModel {
    fn from(raw: PermPagesEdgeRaw) -> Self {
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

impl From<Model> for PermPagesEdge {
    fn from(model: Model) -> Self {
        let perms: Perms = model.perm.into();
        PermPagesEdge {
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
        for p in PagesPerm::iter() {
            if perm & p.get_const_isize().unwrap() as i64 != 0 {
                perms.push(p);
            }
        }
        Perms(perms)
    }
}

pub struct Perms(Vec<PagesPerm>);

impl From<Perms> for i64 {
    fn from(perms: Perms) -> i64 {
        let mut res = 0;
        for perm in perms.0 {
            res |= perm.get_const_isize().unwrap();
        }
        res as i64
    }
}

impl From<Vec<PagesPerm>> for Perms {
    fn from(perms: Vec<PagesPerm>) -> Self {
        Perms(perms)
    }
}

impl From<&[PagesPerm]> for Perms {
    fn from(perms: &[PagesPerm]) -> Self {
        Perms(perms.to_vec())
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

use crate::Result;
use crate::db::entity::edge::perm_pages::{ActiveModel, Column, Entity, Model};
use crate::graph::edge::{Edge, EdgeQuery, EdgeQueryPerm, EdgeRaw};
use enum_const::EnumConst;
use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter};
use strum::IntoEnumIterator;
use strum_macros::EnumIter;