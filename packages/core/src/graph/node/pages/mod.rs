use serde::{Deserialize, Serialize};

use db::entity::node::pages::ActiveModel as PagesNodeActiveModel;
use db::entity::node::pages::Column as PagesNodeColumn;
use db::entity::node::pages::Model as PagesNodeModel;

use crate::db;
use crate::graph::node::NodeRaw;

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct PagesNodePublic {}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct PagesNodePrivate {
    pub name: String,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct PagesNodePublicRaw {}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct PagesNodePrivateRaw {
    pub name: String,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct PagesNode {
    pub node_id: i64,
    pub public: PagesNodePublic,
    pub private: PagesNodePrivate,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct PagesNodeRaw {
    pub iden: String,
    pub public: PagesNodePublicRaw,
    pub private: PagesNodePrivateRaw,
}

impl From<PagesNodeRaw> for PagesNodeActiveModel {
    fn from(value: PagesNodeRaw) -> Self {
        use sea_orm::ActiveValue::{NotSet, Set};
        Self {
            node_id: NotSet,
            iden: Set(value.iden),
        }
    }
}

impl NodeRaw<PagesNode, PagesNodeModel, PagesNodeActiveModel> for PagesNodeRaw {
    fn get_node_id_column(
        &self,
    ) -> <<PagesNodeActiveModel as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Column
    {
        PagesNodeColumn::NodeId
    }

    fn get_node_type(&self) -> &str {
        "pages"
    }
}