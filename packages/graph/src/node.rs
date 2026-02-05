use serde::{Deserialize, Serialize};
use std::fmt::Debug;

pub trait NodeRequire = for<'de> Deserialize<'de> + Serialize + Clone + Debug;

pub struct Node<T> where
T:  {
    pub node_id: i64,
    pub content: T,
}


pub trait StoreNodeAsync where
Self: for<'de> Deserialize<'de> + Serialize + Clone + Debug {
    type StoreTool;
    fn get_node(s: Self::StoreTool) -> impl Future<Output = Node<Self>>;
}