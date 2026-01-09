use sea_orm::ColumnTrait;
use sea_orm::{QueryFilter, QueryOrder};

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct TestcaseEdge {
    pub id: i64,
    pub u: i64,
    pub v: i64,
    pub order: i64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct TestcaseEdgeRaw {
    pub u: i64,
    pub v: i64,
    pub order: i64,
}

impl EdgeRaw<TestcaseEdge, Model, ActiveModel> for TestcaseEdgeRaw {
    fn get_edge_type(&self) -> &str {
        "testcase_edge"
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

impl From<TestcaseEdgeRaw> for ActiveModel {
    fn from(raw: TestcaseEdgeRaw) -> Self {
        use sea_orm::ActiveValue::{NotSet, Set};
        ActiveModel {
            edge_id: NotSet,
            u_node_id: Set(raw.u),
            v_node_id: Set(raw.v),
            order: Set(raw.order),
        }
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct TestcaseEdgeQuery;

impl From<Model> for TestcaseEdge {
    fn from(model: Model) -> Self {
        TestcaseEdge {
            id: model.edge_id,
            u: model.u_node_id,
            v: model.v_node_id,
            order: model.order,
        }
    }
}

impl Edge<ActiveModel, Model, Entity> for TestcaseEdge {
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
impl EdgeQuery<ActiveModel, Model, Entity, TestcaseEdge> for TestcaseEdgeQuery {
    fn get_edge_type() -> &'static str {
        "training_problem"
    }
}

impl EdgeQueryOrder<ActiveModel, Model, Entity, TestcaseEdge> for TestcaseEdgeQuery {
    async fn get_order_id(u: i64, order: i64, db: &DatabaseConnection) -> Result<i64> {
        let val = Entity::find()
            .filter(Column::UNodeId.eq(u))
            .filter(Column::Order.eq(order))
            .one(db)
            .await?;
        if let Some(val) = val {
            Ok(val.v_node_id)
        } else {
            Err(CoreError::NotFound(
                "Cannot found specific order.".to_string(),
            ))
        }
    }

    async fn get_order_asc(u: i64, db: &DatabaseConnection) -> Result<Vec<i64>> {
        Ok(Entity::find()
            .filter(Column::UNodeId.eq(u))
            .order_by_asc(Column::Order)
            .all(db)
            .await?
            .into_iter()
            .map(|m| m.v_node_id)
            .collect())
    }

    async fn get_order_asc_extend(u: i64, db: &DatabaseConnection) -> Result<Vec<TestcaseEdge>> {
        let models = Entity::find()
            .filter(Column::UNodeId.eq(u))
            .order_by_asc(Column::Order)
            .all(db)
            .await?;
        Ok(models.into_iter().map(|m| m.into()).collect())
    }

    async fn get_order_desc(u: i64, db: &DatabaseConnection) -> Result<Vec<i64>> {
        Ok(Entity::find()
            .filter(Column::UNodeId.eq(u))
            .order_by_desc(Column::Order)
            .all(db)
            .await?
            .into_iter()
            .map(|m| m.v_node_id)
            .collect())
    }

    async fn get_order_desc_extend(u: i64, db: &DatabaseConnection) -> Result<Vec<TestcaseEdge>> {
        let models = Entity::find()
            .filter(Column::UNodeId.eq(u))
            .order_by_desc(Column::Order)
            .all(db)
            .await?;
        Ok(models.into_iter().map(|m| m.into()).collect())
    }
}

use crate::Result;
use crate::db::entity::edge::testcase::{ActiveModel, Column, Entity, Model};
use crate::error::CoreError;
use crate::graph::edge::{Edge, EdgeQuery, EdgeQueryOrder, EdgeRaw};
use sea_orm::{DatabaseConnection, EntityTrait};
use serde::{Deserialize, Serialize};
