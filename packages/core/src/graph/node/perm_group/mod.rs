use serde::{Deserialize, Serialize};

use db::entity::node::perm_group::ActiveModel as PermGroupNodeActiveModel;
use db::entity::node::perm_group::Column as PermGroupNodeColumn;
use db::entity::node::perm_group::Model as PermGroupNodeModel;

use crate::db;
use crate::graph::node::NodeRaw;

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct PermGroupNodePublic {
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct PermGroupNodePrivate {
    pub name: String,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct PermGroupNodePublicRaw {
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct PermGroupNodePrivateRaw {
    pub name: String,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct PermGroupNode {
    pub node_id: i64,
    pub node_iden: String,
    pub public: PermGroupNodePublic,
    pub private: PermGroupNodePrivate,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct PermGroupNodeRaw {
    pub iden: String,
    pub service: String,
    pub public: PermGroupNodePublicRaw,
    pub private: PermGroupNodePrivateRaw,
}

impl From<PermGroupNodeRaw> for PermGroupNodeActiveModel {
    fn from(value: PermGroupNodeRaw) -> Self {
        use sea_orm::ActiveValue::{NotSet, Set};
        Self {
            node_id: NotSet,
            node_iden: Set(value.iden.clone()),
            iden: Set(value.iden),
        }
    }
}


impl NodeRaw<PermGroupNode, PermGroupNodeModel, PermGroupNodeActiveModel> for PermGroupNodeRaw {
    fn get_node_id_column(
        &self,
    ) -> <<PermGroupNodeActiveModel as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Column
    {
        PermGroupNodeColumn::NodeId
    }

    fn get_node_iden_column(
        &self,
    ) -> <<PermGroupNodeActiveModel as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Column
    {
        PermGroupNodeColumn::NodeIden
    }

    fn get_node_type(&self) -> &str {
        "perm_group"
    }

    fn get_node_iden(&self) -> String {
        format!("perm_group_{}", self.iden)
    }


}
