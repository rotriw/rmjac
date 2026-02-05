use crate::graph::edge::FromTwoTuple;
use crate::service::perm::typed::SaveService;
use sea_orm::DatabaseConnection;
use std::marker::PhantomData;

pub trait PermEdgeTrait {
    fn into_tuple(self) -> (i64, i64, i64); // u, v, w.
}

// this only for save, plz use perm service to get perm.
pub struct PermEdge<DA, DM, DE, E, R>
where
    (DA, DM, DE, E, R): EdgeRequire<DA, DM, DE, E, R>,
{
    // pub u: i64,
    // pub v: i64,
    // pub perm: PhantomData<C>,
    pub _active_model: PhantomData<DA>,
    pub _entity: PhantomData<DA>,
    pub _dm: PhantomData<DM>,
    pub _de: PhantomData<DE>,
    pub _e: PhantomData<E>,
    pub _r: PhantomData<R>,
}

impl<DA, DM, DE, E, R> PermEdge<DA, DM, DE, E, R>
where
    (DA, DM, DE, E, R): EdgeRequire<DA, DM, DE, E, R>,
{
    pub fn new() -> Self {
        Self {
            _active_model: PhantomData,
            _entity: PhantomData,
            _dm: PhantomData,
            _de: PhantomData,
            _e: PhantomData,
            _r: PhantomData,
        }
    }
}

use super::EdgeRequire;
use tap::Conv;

impl<DA, DM, DE, E, R> SaveService for (&PermEdge<DA, DM, DE, E, R>, &DatabaseConnection)
where
    (DA, DM, DE, E, R): EdgeRequire<DA, DM, DE, E, R>,
    E: Into<(i64, i64, i64)> + FromTwoTuple,
    R: From<(i64, i64, i64)>,
{
    async fn del_path(&mut self, u: i64, v: i64, _perm: i64) -> () {
        let _ = E::from_tuple((u, v), self.1).await.delete(self.1).await;
    }

    async fn save_path(&mut self, u: i64, v: i64, perm: i64) -> () {
        let _ = R::from((u, v, perm)).save(&self.1).await;
    }

    async fn load(&mut self) -> Vec<(i64, i64, i64)> {
        let edges = DE::find().all(self.1).await;
        if edges.is_err() {
            log::error!("Get Error {:?}", edges.err());
            return vec![];
        }
        let edges = edges.unwrap();
        edges
            .into_iter()
            .map(|edge| edge.conv::<DM>().conv::<E>().conv::<(i64, i64, i64)>())
            .collect()
    }
}
