
#[derive(Clone, Debug, PartialEq)]
pub struct JudgeEdge {
    pub id: i64,
    pub u: i64,
    pub v: i64,
    pub score: i64,
    pub status: String,
    pub time: i64,
    pub memory: i64,
}

#[derive(Clone, Debug, PartialEq)]
pub struct JudgeEdgeRaw {
    pub u: i64,
    pub v: i64,
    pub score: i64,
    pub status: String,
    pub time: i64,
    pub memory: i64,
}

impl EdgeRaw<JudgeEdge, Model, ActiveModel> for JudgeEdgeRaw {
    fn get_edge_type(&self) -> &str {
        "socket"
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

impl From<JudgeEdgeRaw> for ActiveModel {
    fn from(raw: JudgeEdgeRaw) -> Self {
        use sea_orm::ActiveValue::{NotSet, Set};
        ActiveModel {
            edge_id: NotSet,
            u_node_id: Set(raw.u),
            v_node_id: Set(raw.v),
            score: Set(raw.score),
            status: Set(raw.status),
            time: Set(raw.time),
            memory: Set(raw.memory),
        }
    }
}

impl From<Model> for JudgeEdge {
    fn from(model: Model) -> Self {
        JudgeEdge {
            id: model.edge_id,
            u: model.u_node_id,
            v: model.v_node_id,
            score: model.score,
            status: model.status,
            time: model.time,
            memory: model.memory,
        }
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct JudgeEdgeQuery;

impl Edge<ActiveModel, Model, Entity> for JudgeEdge {
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

impl EdgeQuery<ActiveModel, Model, Entity, JudgeEdge> for JudgeEdgeQuery {
    fn get_edge_type() -> &'static str {
        "socket"
    }
}

impl JudgeEdgeQuery {
    pub async fn get_u_for_all(v:i64, db: &DatabaseConnection) -> Result<Vec<JudgeEdge>> {
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
use crate::db::entity::edge::judge::{ActiveModel, Column, Entity, Model};
use crate::graph::edge::Edge;
use crate::graph::edge::{EdgeQuery, EdgeRaw};
