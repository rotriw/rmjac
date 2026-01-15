use std::marker::PhantomData;
use std::future::Future;
use tap::Conv;
use crate::service::perm::graph::Graph;
use crate::service::perm::typed::{GraphAction, HasPath, PathAction, PermActionService, PermExport, PermSave, PermService, PermTrait, PermVerify, PermVerifySerivce, SaveService};

// impl<T: Fn(i64) -> bool> PermVerify for T {
//     fn verify(&self, perm: i64) -> bool {
//         self(perm)
//     }

// }

// S: Tools
pub struct LocalPerm {
    pub graph: Graph,
}


impl<T: GraphAction + HasPath> PermTrait for T {
    fn check<E: PermVerify>(&self, u: i64, v: i64, perm: &E) -> bool {
        // meet in middle.
        if u == v {
            return true;
        }
        let (have_path, have_perm) = self.verify(u, v, perm);
        if have_path {
            return have_perm;
        }
        let mut u_next = self.get_total_v(u);
        u_next.retain(|item| perm.verify(item.perm));
        let mut v_prev = self.get_total_u(v);
        v_prev.retain(|item| perm.verify(item.perm));
        let mut choice = u_next.iter().map(|item| (item.count, 0, item.point)).collect::<Vec<(i64, i32, i64)>>();
        choice.extend(v_prev.iter().map(|item| (item.count, 1, item.point)));
        choice.sort_by(|a, b| a.0.cmp(&b.0));
        for (_, dir, point) in choice {
            match dir {
                0 => {
                    if self.check(point, v, perm) {
                        return true;
                    }
                }
                1 => {
                    if self.check(u, point, perm) {
                        return true;
                    }
                }
                _ => {}
            }
        }

        false
    }
}

pub type PermEnum<NT> = PermSave<NT, NT>;

pub trait NTRequire<NT> = PermVerify + PermExport;

pub struct DefaultPermService<NT: NTRequire<NT>, P: PermVerify = NT> {
    pub local: LocalPerm,
    _verify: PhantomData<PermSave<NT, NT>>,
    _p: PhantomData<P>,
}

impl<NT: NTRequire<NT>, P: PermVerify> PermVerifySerivce<P> for DefaultPermService<NT, P> {

    fn verify<L: Into<P> + Clone>(&self, u: i64, v: i64, perm: L) -> bool {
        self.local.graph.check(u, v, &(perm.clone().conv::<P>()))
    }
}

impl<NT: NTRequire<NT>, P: PermVerify, I> PermVerifySerivce<P> for (DefaultPermService<NT, P>, I) {

    fn verify<L: Into<P> + Clone>(&self, u: i64, v: i64, perm: L) -> bool {
        self.0.local.graph.check(u, v, &(perm.clone().conv::<P>()))
    }
}

impl<NT: NTRequire<NT>, P: PermVerify, I> PermVerifySerivce<P> for (&mut DefaultPermService<NT, P>, I) {

    fn verify<L: Into<P> + Clone>(&self, u: i64, v: i64, perm: L) -> bool {
        self.0.local.graph.check(u, v, &(perm.clone().conv::<P>()))
    }
}


impl<NT: NTRequire<NT>, P: PermVerify, I> PermVerifySerivce<P> for (&DefaultPermService<NT, P>, I) {

    fn verify<L: Into<P> + Clone>(&self, u: i64, v: i64, perm: L) -> bool {
        self.0.local.graph.check(u, v, &(perm.clone().conv::<P>()))
    }
}

// impl<NT: NTRequire<NT>, P: PermVerify, S: SaveService> PermActionService<P> for (&mut DefaultPermService<NT, P>, S) {
//     fn add_path(&mut self, u: i64, v: i64, perm: &P) -> impl Future<Output = ()> {
//         async move {
                    
//                 self.1.save_path(u, v, perm.get_value());
//                 self.0.local.graph.add_perm(u, v, perm.get_value());
//                 async {}
//             }
//         }

//     fn del_path(&mut self, u: i64, v: i64) -> impl Future<Output = ()> {
//         self.1.del_path(u, v, 0);
//         self.0.local.graph.del_perm::<i64>(u, v);
//         async {}
//     }

//     fn init(&mut self) -> impl Future<Output = ()> {
//         let load_data = self.1.load();
//         let local = &mut self.0.local;
//         async move {
//             let data = load_data.await;
//             for (u, v, perm) in data {
//                 local.graph.add_perm::<i64>(u, v, perm);
//             }
//         }
//     }
// }

impl<NT: NTRequire<NT>, P: PermVerify, S: SaveService> PermActionService<P> for (DefaultPermService<NT, P>, S) {
    fn add_path(&mut self, u: i64, v: i64, perm: &P) -> impl Future<Output = ()> {
        self.1.save_path(u, v, perm.get_value());
        self.0.local.graph.add_perm(u, v, perm.get_value());
        async {}
    }

    fn del_path(&mut self, u: i64, v: i64) -> impl Future<Output = ()> {
        self.1.del_path(u, v, 0);
        self.0.local.graph.del_perm(u, v);
        async {}
    }

    fn init(&mut self) -> impl Future<Output = ()> {
        let load_data = self.1.load();
        let local = &mut self.0.local;
        async move {
            let data = load_data.await;
            for (u, v, perm) in data {
                local.graph.add_perm::<i64>(u, v, perm);
            }
        }
    }
}

impl<NT: NTRequire<NT>, P: PermVerify, S: SaveService> PermService<P> for (DefaultPermService<NT, P>, S) {}
// impl<NT: NTRequire<NT>, P: PermVerify, S: SaveService> PermService<P> for (&mut DefaultPermService<NT, P>, S) {}

impl PermVerify for i64 {
    fn verify(&self, perm: i64) -> bool {
        self & perm != 0
    }

    fn get_value(&self) -> i64 {
        *self
    }
}

default impl<T: Into<i64> + Clone> PermVerify for T {
    fn verify(&self, perm: i64) -> bool {
        (self.clone().conv::<i64>()) & perm != 0
    }

    fn get_value(&self) -> i64 {
        self.clone().conv::<i64>()
    }
}

impl<NT, P> DefaultPermService<NT, P>
where
    NT: NTRequire<NT>,
    P: PermVerify,
{
    pub fn new() -> Self {
        Self {
            local: LocalPerm {
                graph: Graph {
                    node: std::collections::HashMap::new(),
                },
            },
            _verify: PhantomData,
            _p: PhantomData,
        }
    }
}