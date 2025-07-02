use sea_orm::ActiveValue::{NotSet, Set};
use serde::{Deserialize, Serialize};

use crate::db::entity::node::problem_tag;
use crate::graph::node::NodeRaw;

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
    pub node_iden: String,
    pub public: ProblemTagNodePublic,
    pub private: ProblemTagNodePrivate,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemTagNodeRaw {
    pub iden: String,
    pub public: ProblemTagNodePublicRaw,
    pub private: ProblemTagNodePrivateRaw,
}

impl From<problem_tag::Model> for ProblemTagNode {
    fn from(model: problem_tag::Model) -> Self {
        ProblemTagNode {
            node_id: model.node_id,
            node_iden: model.node_iden,
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

impl NodeRaw<ProblemTagNode, problem_tag::Model, problem_tag::ActiveModel> for ProblemTagNodeRaw {
    fn get_node_type(&self) -> &str {
        "problem_tag"
    }

    fn get_node_iden(&self) -> String {
        format!("problem_tag_{}", self.iden)
    }

    fn get_node_id_column(&self) -> <<problem_tag::ActiveModel as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Column{
        problem_tag::Column::NodeId
    }

    fn get_node_iden_column(&self) -> <<problem_tag::ActiveModel as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Column{
        problem_tag::Column::NodeIden
    }
}
