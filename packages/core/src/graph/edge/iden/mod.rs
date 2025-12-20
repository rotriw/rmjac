
#[derive(Clone, Debug, PartialEq)]
pub struct IdenEdge {
    pub id: i64,
    pub u: i64,
    pub v: i64,
    pub iden: String,
    pub weight: i64,
}

#[derive(Clone, Debug, PartialEq)]
pub struct IdenEdgeRaw {
    pub u: i64,
    pub v: i64,
    pub iden: String,
    pub weight: i64,
}

impl EdgeRaw<IdenEdge, Model, ActiveModel> for IdenEdgeRaw {
    fn get_edge_type(&self) -> &str {
        "iden"
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
}

impl From<IdenEdgeRaw> for ActiveModel {
    fn from(raw: IdenEdgeRaw) -> Self {
        use sea_orm::ActiveValue::{NotSet, Set};
        ActiveModel {
            edge_id: NotSet,
            u_node_id: Set(raw.u),
            v_node_id: Set(raw.v),
            iden: Set(raw.iden),
            weight: Set(raw.weight),
        }
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct IdenEdgeQuery;

impl Edge<ActiveModel, Model, Entity> for IdenEdge {
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

impl EdgeQuery<ActiveModel, Model, Entity, IdenEdge> for IdenEdgeQuery {
    fn get_edge_type() -> &'static str {
        "iden"
    }
}

impl IdenEdgeQuery {
    pub async fn get_u_for_all(v:i64, db: &DatabaseConnection) -> Result<Vec<IdenEdge>> {
        Ok(Entity::find()
            .filter(Column::VNodeId.eq(v))
            .all(db)
            .await?
            .into_iter()
            .map(|model| model.into())
            .collect())
    }
}


use sea_orm::{DatabaseConnection, EntityTrait, QueryFilter};
use sea_orm::ColumnTrait;
use crate::Result;
use crate::db::entity::edge::iden::{ActiveModel, Column, Entity, Model};
use crate::graph::edge::Edge;
use crate::graph::edge::{EdgeQuery, EdgeRaw};
