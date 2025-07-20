use sea_orm::QueryFilter;
use sea_orm::{ColumnTrait, EntityTrait};
use sea_orm::DatabaseConnection;
use sea_orm::sea_query::IntoCondition;
use crate::db::entity::edge::problem_statement::{Column, Entity};
use crate::db::entity::edge::problem_statement;
use crate::graph::edge::{EdgeQuery, EdgeRaw};

#[derive(Clone, Debug, PartialEq)]
pub struct ProblemStatementEdge {
    pub id: i64,
    pub u: i64,
    pub v: i64,
    pub copyright_risk: i64,
}

#[derive(Clone, Debug, PartialEq)]
pub struct ProblemStatementEdgeRaw {
    pub u: i64,
    pub v: i64,
    pub copyright_risk: i64,
}

impl EdgeRaw<ProblemStatementEdge, problem_statement::Model, problem_statement::ActiveModel>
    for ProblemStatementEdgeRaw
{
    fn get_edge_type(&self) -> &str {
        "problem_statement"
    }

    fn get_edge_id_column(&self) -> <<problem_statement::ActiveModel as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Column{
        problem_statement::Column::EdgeId
    }
}

impl From<ProblemStatementEdgeRaw> for problem_statement::ActiveModel {
    fn from(raw: ProblemStatementEdgeRaw) -> Self {
        use sea_orm::ActiveValue::{NotSet, Set};
        problem_statement::ActiveModel {
            edge_id: NotSet,
            u_node_id: Set(raw.u),
            v_node_id: Set(raw.v),
            copyright_risk: Set(raw.copyright_risk),
        }
    }
}

pub struct ProblemStatementEdgeQuery;

impl EdgeQuery for ProblemStatementEdgeQuery {
    async fn get_v(u: i64, db: &DatabaseConnection) -> crate::Result<Vec<i64>> {
        let res = Entity::find()
            .filter(Column::UNodeId.eq(u))
            .all(db)
            .await?;
        Ok(res.into_iter().map(|x| x.v_node_id).collect())
    }

    async fn get_v_filter<T: IntoCondition>(u: i64, filter: T, db: &DatabaseConnection) -> crate::Result<Vec<i64>> {
        let edges = Entity::find()
            .filter(filter)
            .filter(Column::UNodeId.eq(u))
            .all(db)
            .await?;
        Ok(edges.into_iter().map(|edge| edge.u_node_id).collect())
    }

    fn get_edge_type() -> &'static str {
        "problem_statement"
    }

}