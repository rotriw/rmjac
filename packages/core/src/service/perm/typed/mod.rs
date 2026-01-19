use std::{future::Future, marker::PhantomData, ops::Add};

use strum::IntoEnumIterator;


pub trait PermService<T: PermVerify>: PermVerifySerivce<T> + PermActionService<T> {}

pub trait PermVerifySerivce<P: PermVerify> {
    fn verify<L: Into<P> + Clone>(&self, u: i64, v: i64, perm: L) -> bool;
}

pub trait PermActionService<P: PermVerify> {
    fn add_path(&mut self, u: i64, v: i64, perm: &P) -> impl Future<Output = ()>;
    fn del_path(&mut self, u: i64, v: i64) -> impl Future<Output = ()>;
    fn rm_path(&mut self, u: i64, v: i64, perm: &P) -> impl Future<Output = ()>;
    fn modify_path(&mut self, u: i64, v: i64, perm: &P) -> impl Future<Output = ()> {
        async move {
            self.del_path(u, v).await;
            self.add_path(u, v, perm).await;
        }
    }
    fn init(&mut self) -> impl Future<Output = ()>;
}

pub trait SaveService {
    fn save_path(&mut self, u: i64, v: i64, perm: i64) -> impl Future<Output = ()>;
    fn del_path(&mut self, u: i64, v: i64, perm: i64) -> impl Future<Output = ()>;
    fn modify_path(&mut self, u: i64, v: i64, perm: i64) -> impl Future<Output = ()> {
        async move {
            self.del_path(u, v, 0).await;
            self.save_path(u, v, perm).await;
        }
    }
    fn load(&mut self) -> impl Future<Output = Vec<(i64, i64, i64)>>;
}


pub trait PermVerify {
    fn verify(&self, perm: i64) -> bool;
    fn get_value(&self) -> i64;
}

pub trait PermTrait {
    fn check<T: PermVerify>(&self, u: i64, v: i64, perm_ck: &T) -> bool;
}

pub trait HasPath {
    fn get_path(&self, u: i64, v: i64) -> Option<i64>;
    fn has_path<T: PermVerify>(&self, u: i64, v: i64, perm: &T) -> (bool, bool); // have_u->v, have_p
}


pub struct NextValue<T: Into<i64>> {
    pub point: i64,
    pub perm: T,
    pub count: i64,
}

pub trait GetV {
    fn get_total_v(&self, id: i64) -> Vec<NextValue<i64>>;
}

pub trait GetU {
    fn get_total_u(&self, id: i64) -> Vec<NextValue<i64>>;
}

pub trait PathAction {
    fn add_perm<T: Into<i64>>(&mut self, u: i64, v: i64, perm: T);
    fn del_perm(&mut self, u: i64, v: i64);
}

pub trait GraphAction: GetV + GetU + PathAction {}

pub struct PermSave<NT, I> {
    pub perm: i64,
    pub _nt: PhantomData<NT>,
    pub _i: PhantomData<I>
}

pub trait PermImport<M> {
    fn import_from_perms(perms: Vec<M>) -> Self;
    fn import_from_perm(perm: M) -> Self;
}

pub trait PermExport {
    type Result;
    fn export_perm(&self) -> Vec<Self::Result>;
}

impl<NT, I, E: Into<PermSave<NT, I>>> Add<E> for PermSave<NT, I> {
    type Output = Self;
    fn add(self, other: E) -> Self {
        let other = other.into();
        Self {
            perm: self.perm | other.perm,
            _nt: PhantomData,
            _i: PhantomData,
        }
    }
}

impl<NT, I> PermVerify for PermSave<NT, I> {
    fn verify(&self, perm: i64) -> bool {
        (self.perm & perm) == perm
    }
    fn get_value(&self) -> i64 {
        self.perm
    }
}

impl<NT: Into<i64>, I> From<NT> for PermSave<NT, I> {
    fn from(value: NT) -> Self {
        Self {
            perm: value.into(),
            _nt: PhantomData,
            _i: PhantomData,
        }
    }
}

impl<NT: Into<i64> + IntoEnumIterator + Clone> PermExport for PermSave<NT, NT>  {
    type Result = NT;
    fn export_perm(&self) -> Vec<NT> {
        let mut perms = vec![];
        for p in NT::iter() {
            let perm_value: i64 = p.clone().into();
            if self.perm & perm_value != 0 {
                perms.push(p);
            }
        }
        perms
    }
}

impl<NT: Into<i64>, I> Into<i64> for PermSave<NT, I> {
    fn into(self) -> i64 {
        self.perm
    }
}
