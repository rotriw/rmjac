use chrono::NaiveDateTime;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};
use serde::{Deserialize, Serialize};
use crate::error::CoreError;
use crate::Result;
use crate::db::entity::node::problem_statement::{self, ContentType};
use crate::graph::node::{Node, NodeRaw};

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemStatementNodePublic {
    pub statements: Vec<ContentType>,
    pub source: String,
    pub creation_time: NaiveDateTime,
    pub update_time: NaiveDateTime,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemStatementNodePrivate {}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemStatementNodePublicRaw {
    pub statements: Vec<ContentType>,
    pub source: String,
    pub iden: String,
    pub creation_time: NaiveDateTime,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemStatementNodePrivateRaw {}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemStatementNode {
    pub node_id: i64,
    pub public: ProblemStatementNodePublic,
    pub private: ProblemStatementNodePrivate,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemStatementNodeRaw {
    pub public: ProblemStatementNodePublicRaw,
    pub private: ProblemStatementNodePrivateRaw,
}

impl Node for ProblemStatementNode {
    async fn from_db(
            db: &sea_orm::DatabaseConnection,
            node_id: i64,
        ) -> Result<Self>
        where
            Self: Sized
    {
        let result = problem_statement::Entity::find()
            .filter(problem_statement::Column::NodeId.eq(node_id))
            .one(db)
            .await?.ok_or(CoreError::NotFound("NodeId".to_string()))?;
        Ok(result.into())
    }

    fn get_node_id(&self) -> i64 {
        self.node_id
    }
}

impl From<problem_statement::Model> for ProblemStatementNode {
    fn from(model: problem_statement::Model) -> Self {
        ProblemStatementNode {
            node_id: model.node_id,
            public: ProblemStatementNodePublic {
                statements: model.content,
                source: model.source,
                creation_time: model.creation_time,
                update_time: model.update_time,
            },
            private: ProblemStatementNodePrivate {},
        }
    }
}

impl From<ProblemStatementNodeRaw> for problem_statement::ActiveModel {
    fn from(value: ProblemStatementNodeRaw) -> Self {
        problem_statement::ActiveModel {
            node_id: NotSet,
            iden: Set(value.public.iden),
            source: Set(value.public.source),
            content: Set(value.public.statements),
            creation_time: Set(value.public.creation_time),
            update_time: Set(value.public.creation_time),
        }
    }
}

impl NodeRaw<ProblemStatementNode, problem_statement::Model, problem_statement::ActiveModel>
    for ProblemStatementNodeRaw
{
    fn get_node_type(&self) -> &str {
        "problem_statement"
    }

    fn get_node_id_column(&self) -> <<problem_statement::ActiveModel as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Column{
        problem_statement::Column::NodeId
    }
}
