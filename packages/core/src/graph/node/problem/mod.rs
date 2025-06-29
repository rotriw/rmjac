use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};

pub mod statement;

use crate::db::entity::node::problem;
use crate::graph::node::NodeRaw;

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemNodePublic {
    pub name: String,
    pub creation_time: NaiveDateTime,
    pub creation_order: i64,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemNodePrivate {}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemNodePublicRaw {
    pub name: String,
    pub creation_time: NaiveDateTime,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemNodePrivateRaw {}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemNode {
    pub node_id: i64,
    pub node_iden: String,
    pub public: ProblemNodePublic,
    pub private: ProblemNodePrivate,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemNodeRaw {
    pub public: ProblemNodePublicRaw,
    pub private: ProblemNodePrivateRaw,
}

impl From<crate::db::entity::node::problem::Model> for ProblemNode {
    fn from(model: crate::db::entity::node::problem::Model) -> Self {
        ProblemNode {
            node_id: model.node_id,
            node_iden: model.node_iden,
            public: ProblemNodePublic {
                name: model.name,
                creation_time: model.creation_time,
                creation_order: model.creation_order,
            },
            private: ProblemNodePrivate {},
        }
    }
}

impl From<ProblemNodeRaw> for crate::db::entity::node::problem::ActiveModel {
    fn from(value: ProblemNodeRaw) -> Self {
        use sea_orm::ActiveValue::{NotSet, Set};
        Self {
            node_id: NotSet,
            node_iden: Set(format!("problem_{}", value.public.name)),
            name: Set(value.public.name),
            content_public: NotSet,
            content_private: NotSet,
            creation_time: Set(value.public.creation_time),
            creation_order: NotSet,
        }
    }
}

impl
    NodeRaw<
        ProblemNode,
        crate::db::entity::node::problem::Model,
        crate::db::entity::node::problem::ActiveModel,
    > for ProblemNodeRaw
{
    fn get_node_id_column(&self) -> <<crate::db::entity::node::problem::ActiveModel as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Column{
        problem::Column::NodeId
    }

    fn get_node_iden_column(&self) -> <<crate::db::entity::node::problem::ActiveModel as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Column{
        problem::Column::NodeIden
    }

    fn get_node_iden(&self) -> String {
        format!("problem_{}", self.public.name)
    }

    fn get_node_type(&self) -> &str {
        "problem"
    }
}
