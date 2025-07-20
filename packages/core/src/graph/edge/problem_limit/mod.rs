use sea_orm::DatabaseConnection;
use sea_orm::sea_query::IntoCondition;
use crate::db::entity::edge::problem_limit;
use crate::graph::edge::{EdgeQuery, EdgeRaw};
use crate::Result;

#[derive(Clone, Debug, PartialEq)]
pub struct ProblemLimitEdge {
    pub id: i64,
    pub u: i64,
    pub v: i64,
}

#[derive(Clone, Debug, PartialEq)]
pub struct ProblemLimitEdgeRaw {
    pub u: i64,
    pub v: i64,
}

impl EdgeRaw<ProblemLimitEdge, problem_limit::Model, problem_limit::ActiveModel>
    for ProblemLimitEdgeRaw
{
    fn get_edge_type(&self) -> &str {
        "problem_limit"
    }

    fn get_edge_id_column(&self) -> <<problem_limit::ActiveModel as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Column{
        problem_limit::Column::EdgeId
    }
}

impl From<ProblemLimitEdgeRaw> for problem_limit::ActiveModel {
    fn from(raw: ProblemLimitEdgeRaw) -> Self {
        use sea_orm::ActiveValue::{NotSet, Set};
        problem_limit::ActiveModel {
            edge_id: NotSet,
            u_node_id: Set(raw.u),
            v_node_id: Set(raw.v),
        }
    }
}

pub struct ProblemLimitEdgeQuery;

impl EdgeQuery for ProblemLimitEdgeQuery {
    fn get_edge_type() -> &'static str {
        "problem_limit"
    }

    async fn get_v(u: i64, db: &DatabaseConnection) -> Result<Vec<i64>> {
        use crate::db::entity::edge::perm_view::Entity as PermViewEntity;
        use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};

        let edges = PermViewEntity::find()
            .filter(problem_limit::Column::UNodeId.eq(u))
            .all(db)
            .await?;
        Ok(edges.into_iter().map(|edge| edge.v_node_id).collect())
    }

    async fn get_v_filter<T: IntoCondition>(u: i64, filter: T, db: &DatabaseConnection) -> Result<Vec<i64>> {
        use crate::db::entity::edge::problem_limit::Entity;
        use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};
        let edges = Entity::find()
            .filter(filter)
            .filter(crate::db::entity::edge::problem_limit::Column::UNodeId.eq(u))
            .all(db)
            .await?;
        Ok(edges.into_iter().map(|edge| edge.u_node_id).collect())
    }
}
