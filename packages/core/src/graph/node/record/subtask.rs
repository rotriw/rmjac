#[derive(Deserialize, Serialize, Debug, Clone, EnumConst, EnumIter)]
pub enum SubtaskCalcMethod {
    Sum = 0,
    Max = 1,
    Min = 2,
    Function = 3,
}

impl From<SubtaskCalcMethod> for i32 {
    fn from(method: SubtaskCalcMethod) -> Self {
        method.get_const_isize().unwrap_or(0) as i32
    }
}

impl From<String> for SubtaskCalcMethod {
    fn from(s: String) -> Self {
        match s.as_str() {
            "sum" => SubtaskCalcMethod::Sum,
            "max" => SubtaskCalcMethod::Max,
            "min" => SubtaskCalcMethod::Min,
            "function" => SubtaskCalcMethod::Function,
            _ => SubtaskCalcMethod::Sum,
        }
    }
}

//noinspection ALL
impl ToString for SubtaskCalcMethod {
    fn to_string(&self) -> String {
        match self {
            SubtaskCalcMethod::Sum => "sum".to_string(),
            SubtaskCalcMethod::Max => "max".to_string(),
            SubtaskCalcMethod::Min => "min".to_string(),
            SubtaskCalcMethod::Function => "function".to_string(),
        }
    }
}

impl From<i32> for SubtaskCalcMethod {
    fn from(method: i32) -> Self {
        match method {
            0 => SubtaskCalcMethod::Sum,
            1 => SubtaskCalcMethod::Max,
            2 => SubtaskCalcMethod::Min,
            3 => SubtaskCalcMethod::Function,
            _ => SubtaskCalcMethod::Sum,
        }
    }
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct SubtaskNodePublic {
    pub subtask_id: i32,
    pub time_limit: i64,
    pub memory_limit: i64,
    pub subtask_calc_method: SubtaskCalcMethod,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct SubtaskNodePrivate {
    pub subtask_calc_function: Option<String>,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct SubtaskNodePublicRaw {
    pub subtask_id: i32,
    pub time_limit: i64,
    pub memory_limit: i64,
    pub subtask_calc_method: SubtaskCalcMethod,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct SubtaskNodePrivateRaw {
    pub subtask_calc_function: Option<String>,
}

#[derive(Deserialize, Serialize, Debug, Clone, Node)]
pub struct SubtaskNode {
    pub node_id: i64,
    pub public: SubtaskNodePublic,
    pub private: SubtaskNodePrivate,
}

#[derive(Deserialize, Serialize, Debug, Clone, NodeRaw)]
#[node_raw(node_type = "testcase_subtask")]
pub struct SubtaskNodeRaw {
    pub public: SubtaskNodePublicRaw,
    pub private: SubtaskNodePrivateRaw,
}

impl From<SubtaskNodeRaw> for ActiveModel {
    fn from(value: SubtaskNodeRaw) -> Self {
        use sea_orm::ActiveValue::{NotSet, Set};
        Self {
            node_id: NotSet,
            subtask_id: Set(value.public.subtask_id),
            time_limit: Set(value.public.time_limit),
            memory_limit: Set(value.public.memory_limit),
            subtask_calc_method: Set(value.public.subtask_calc_method.into()),
            subtask_calc_function: Set(value.private.subtask_calc_function),
        }
    }
}

impl From<Model> for SubtaskNode {
    fn from(model: Model) -> Self {
        Self {
            node_id: model.node_id,
            public: SubtaskNodePublic {
                subtask_id: model.subtask_id,
                time_limit: model.time_limit,
                memory_limit: model.memory_limit,
                subtask_calc_method: model.subtask_calc_method.into(),
            },
            private: SubtaskNodePrivate {
                subtask_calc_function: model.subtask_calc_function,
            },
        }
    }
}

use crate::db;
use crate::graph::node::Node;
use crate::graph::node::NodeRaw;
use db::entity::node::testcase_subtask::{ActiveModel, Column, Entity, Model};
use enum_const::EnumConst;
use macro_node_iden::{Node, NodeRaw};
use sea_orm::EntityTrait;
use serde::{Deserialize, Serialize};
use strum_macros::EnumIter;
