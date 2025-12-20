#[derive(Clone, Debug, PartialEq)]
pub struct PermProblemEdge {
    pub id: i64,
    pub u: i64,
    pub v: i64,
    pub perms: Vec<ProblemPerm>,
}

#[derive(Clone, Debug, PartialEq)]
pub struct PermProblemEdgeRaw {
    pub u: i64,
    pub v: i64,
    pub perms: ProblemPermRaw,
}

#[derive(Clone, Debug, PartialEq)]
pub enum ProblemPermRaw {
    All,
    Perms(Vec<ProblemPerm>),
}

#[derive(EnumConst, Copy, Clone, Debug, PartialEq, EnumIter)]
pub enum ProblemPerm {
    All = -1,
    ReadProblem = 1,
    EditProblem = 2,
    DeleteProblem = 4,
    OwnProblem = 8,

}

impl From<ProblemPermRaw> for i32 {
    fn from(perms: ProblemPermRaw) -> i32 {
        match perms {
            ProblemPermRaw::All => {
                let mut res = 0;
                for i in ProblemPerm::iter() {
                    if i != ProblemPerm::All {
                        res |= i.get_const_isize().unwrap() as i32;
                    }
                }
                res
            }
            ProblemPermRaw::Perms(perms) => {
                let mut res = 0;
                for perm in perms {
                    res |= perm.get_const_isize().unwrap() as i32;
                }
                res
            }
        }
    }
}

impl EdgeRaw<PermProblemEdge, Model, ActiveModel> for PermProblemEdgeRaw {
    fn get_edge_type(&self) -> &str {
        "perm_problem"
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

impl From<PermProblemEdgeRaw> for ActiveModel {
    fn from(raw: PermProblemEdgeRaw) -> Self {
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

impl From<Model> for PermProblemEdge {
    fn from(model: Model) -> Self {
        let perms: Perms = model.perm.into();
        PermProblemEdge {
            id: model.edge_id,
            u: model.u_node_id,
            v: model.v_node_id,
            perms: perms.0,
        }
    }
}

impl Perm for ProblemPerm {}

pub struct Perms(Vec<ProblemPerm>);

impl From<i64> for Perms {
    fn from(perms: i64) -> Self {
        let mut res = Vec::new();
        if perms == -1 {
            res.push(ProblemPerm::All);
        } else {
            for perm in ProblemPerm::iter() {
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

impl From<Vec<ProblemPerm>> for Perms {
    fn from(perms: Vec<ProblemPerm>) -> Self {
        Perms(perms)
    }
}

impl From<&[ProblemPerm]> for Perms {
    fn from(perms: &[ProblemPerm]) -> Self {
        Perms(perms.to_vec())
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
    async fn get_perm_v(i: i64, db: &DatabaseConnection) -> Result<Vec<(i64, i64)>> {
        use crate::db::entity::edge::perm_problem::Entity as PermProblemEntity;
        use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};

        let edges = PermProblemEntity::find()
            .filter(Column::UNodeId.eq(i))
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
        use crate::db::entity::edge::perm_problem::Entity as PermProblemEntity;
        use sea_orm::EntityTrait;
        let edges = PermProblemEntity::find().all(db).await?;
        Ok(edges
            .into_iter()
            .map(|edge| (edge.u_node_id, edge.v_node_id, edge.perm))
            .collect())
    }
}

use crate::Result;
use crate::db::entity::edge::perm_problem::{ActiveModel, Column, Entity, Model};
use crate::graph::edge::EdgeQuery;
use crate::graph::edge::EdgeRaw;
use crate::graph::edge::{Edge, EdgeQueryPerm};
use crate::utils::perm::Perm;
use enum_const::EnumConst;
use sea_orm::DatabaseConnection;
use strum::IntoEnumIterator;
use strum_macros::EnumIter;