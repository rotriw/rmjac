use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};
use serde::{Deserialize, Serialize};

use crate::db::entity::node::problem_tag;
use crate::graph::node::{Node, NodeRaw};

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemTagNodePublic {
    pub tag_name: String,
    pub tag_description: String,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemTagNodePrivate {}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemTagNodePublicRaw {
    pub tag_name: String,
    pub tag_description: String,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemTagNodePrivateRaw {}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemTagNode {
    pub node_id: i64,
    pub public: ProblemTagNodePublic,
    pub private: ProblemTagNodePrivate,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemTagNodeRaw {
    pub public: ProblemTagNodePublicRaw,
    pub private: ProblemTagNodePrivateRaw,
}

impl From<problem_tag::Model> for ProblemTagNode {
    fn from(model: problem_tag::Model) -> Self {
        ProblemTagNode {
            node_id: model.node_id,
            public: ProblemTagNodePublic {
                tag_name: model.tag_name,
                tag_description: model.tag_description,
            },
            private: ProblemTagNodePrivate {},
        }
    }
}

impl From<ProblemTagNodeRaw> for problem_tag::ActiveModel {
    fn from(value: ProblemTagNodeRaw) -> Self {
        problem_tag::ActiveModel {
            node_id: NotSet,
            node_iden: NotSet,
            tag_name: Set(value.public.tag_name),
            tag_description: Set(value.public.tag_description),
        }
    }
}

impl Node for ProblemTagNode {
    async fn from_db(
        db: &sea_orm::DatabaseConnection,
        node_id: i64,
    ) -> Result<Self, crate::error::CoreError>
    where
        Self: Sized,
    {
        let result = problem_tag::Entity::find()
            .filter(problem_tag::Column::NodeId.eq(node_id))
            .one(db)
            .await?
            .ok_or(crate::error::CoreError::NotFound("NodeId".to_string()))?;
        Ok(result.into())
    }

    fn get_node_id(&self) -> i64 {
        self.node_id
    }
}

impl NodeRaw<ProblemTagNode, problem_tag::Model, problem_tag::ActiveModel> for ProblemTagNodeRaw {
    fn get_node_type(&self) -> &str {
        "problem_tag"
    }
    fn get_node_id_column(&self) -> <<problem_tag::ActiveModel as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Column{
        problem_tag::Column::NodeId
    }
}
