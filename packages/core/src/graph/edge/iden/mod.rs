use crate::graph::edge::IntoCondition;
use crate::db::entity::edge::iden::{ActiveModel, Column, Model};
use crate::graph::edge::{EdgeQuery, EdgeRaw};

#[derive(Clone, Debug, PartialEq)]
pub struct IdenEdge {
    pub id: i64,
    pub u: i64,
    pub v: i64,
    pub iden: String,
}

#[derive(Clone, Debug, PartialEq)]
pub struct IdenEdgeRaw {
    pub u: i64,
    pub v: i64,
    pub iden: String,
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
}

impl From<IdenEdgeRaw> for ActiveModel {
    fn from(raw: IdenEdgeRaw) -> Self {
        use sea_orm::ActiveValue::{NotSet, Set};
        ActiveModel {
            edge_id: NotSet,
            u_node_id: Set(raw.u),
            v_node_id: Set(raw.v),
            iden: Set(raw.iden),
        }
    }
}

pub struct IdenEdgeQuery;

impl EdgeQuery for IdenEdgeQuery {
    fn get_edge_type() -> &'static str {
        "iden"
    }

    async fn get_v(u: i64, db: &sea_orm::DatabaseConnection) -> crate::Result<Vec<i64>> {
        use crate::db::entity::edge::iden::Entity as IdenEntity;
        use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};

        let edges = IdenEntity::find()
            .filter(Column::UNodeId.eq(u))
            .all(db)
            .await?;
        Ok(edges.into_iter().map(|edge| edge.v_node_id).collect())
    }

    async fn get_v_filter<T: IntoCondition>(
        u: i64,
        filter: T,
        db: &sea_orm::DatabaseConnection,
    ) -> crate::Result<Vec<i64>> {
        use crate::db::entity::edge::iden::Entity as IdenEntity;
        use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};

        let edges = IdenEntity::find()
            .filter(filter)
            .filter(Column::UNodeId.eq(u))
            .all(db)
            .await?;
        Ok(edges.into_iter().map(|edge| edge.v_node_id).collect())
    }
}