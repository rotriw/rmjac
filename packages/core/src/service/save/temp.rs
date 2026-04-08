// TODO: // 对于看上去很消耗计算的东西我们可以支持缓存。
//
// use serde::{Deserialize, Serialize};
//
//
// //
// pub trait Stashable {}
//
// #[derive(Debug, Clone, Deserialize, Serialize)]
// pub struct Stash<V: Clone + Stashable> {
//     pub uuid: String,
//     #[serde(flatten)]
//     pub value: V,
// }