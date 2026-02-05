use crate::service::perm::typed::{
    GraphAction, HasPath, PermActionService, PermSave,
    PermTrait, PermVerify, PermVerifySerivce, SaveService,
};
use std::future::Future;
use tap::Conv;

impl<T: GraphAction + HasPath> PermTrait for T {
    fn check<E: PermVerify>(&self, u: i64, v: i64, perm: &E) -> bool {
        // meet in middle.
        log::debug!(
            "Checking permission from {} to {} with perm {:?}",
            u,
            v,
            perm.get_value()
        );
        if u == v {
            return true;
        }
        let (have_path, have_perm) = self.has_path(u, v, perm);
        if have_path {
            return have_perm;
        }
        let mut u_next = self.get_total_v(u);
        u_next.retain(|item| perm.verify(item.perm));
        let mut v_prev = self.get_total_u(v);
        v_prev.retain(|item| perm.verify(item.perm));
        let mut choice = u_next
            .iter()
            .map(|item| (item.count, 0, item.point))
            .collect::<Vec<(i64, i32, i64)>>();
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

/// PermEnum 即 PermSave, 可以翻译为 数字，等价权限组。
pub type PermEnum<NT> = PermSave<NT, NT>;

impl<P: PermVerify, T: PermTrait> PermVerifySerivce<P> for T {
    fn verify<L: Into<P> + Clone>(&self, u: i64, v: i64, perm: L) -> bool {
        self.check(u, v, &(perm.clone().conv::<P>()))
    }
}

impl<P: PermVerify, T: PermTrait + GraphAction + HasPath, S: SaveService> PermActionService<P>
    for (&mut T, S)
{
    fn add_path(&mut self, u: i64, v: i64, perm: &P) -> impl Future<Output = ()> {
        async move {
            let x = (*self.0).get_path(u, v);
            if x.is_some() {
                let new_perm = x.unwrap() | perm.get_value();
                (*self.0).del_perm(u, v);
                (*self.0).add_perm(u, v, new_perm);
                self.1.del_path(u, v, perm.get_value()).await;
                self.1.save_path(u, v, new_perm).await;
                return ();
            }
            self.1.save_path(u, v, perm.get_value()).await;
            (*self.0).add_perm(u, v, perm.get_value());
        }
    }

    fn del_path(&mut self, u: i64, v: i64) -> impl Future<Output = ()> {
        async move {
            self.1.del_path(u, v, 0).await;
            (*self.0).del_perm(u, v);
        }
    }

    fn rm_path(&mut self, u: i64, v: i64, perm: &P) -> impl Future<Output = ()> {
        async move {
            let x = (*self.0).get_path(u, v);
            if x.is_none() {
                return ();
            }
            let current_perm = x.unwrap();
            let new_perm = current_perm & (!perm.get_value());
            self.0.del_perm(u, v);
            self.1.del_path(u, v, current_perm).await;
            if new_perm != 0 {
                self.0.add_perm(u, v, new_perm);
                self.1.save_path(u, v, new_perm).await;
            }
        }
    }

    fn init(&mut self) -> impl Future<Output = ()> {
        async move {
            let load_data = self.1.load();
            let data = load_data.await;
            for (u, v, perm) in data {
                (*self.0).add_perm::<i64>(u, v, perm);
            }
        }
    }
}

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
