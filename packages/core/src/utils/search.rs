use std::ops::Deref;
use tap::Conv;
use crate::model::ModelStore;
use crate::Result;

pub async fn search_combine<'a, E, F, K, S, GV>(query_func: K, now_v: &mut Vec<F>, is_s: &mut bool, db: &'a mut S, value: Option<E>, range: (u64, u64)) -> Result<()> where
K: Fn(&'a mut S, E, (u64, u64)) -> GV,
S: ModelStore,
F: Ord + Into<i64> + Clone,
GV: Future<Output = Result<Vec<F>>>
{
    if value.is_none() {
        return Ok(())
    }
    let value = value.unwrap();
    let mut result = now_v;
    let new_value = query_func(db, value, range).await?;
    if !*is_s {
        *result = new_value;
    } else {
        result.retain(|x| {
            new_value.contains(x)
        });
    }
    *is_s = true;
    Ok(())
}