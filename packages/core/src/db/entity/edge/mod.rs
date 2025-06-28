pub mod edge;
pub mod perm_view;
pub mod perm_manage;

pub trait Perm {
    fn add_perm<T>(self, perm: T) -> Self where T: Into<Self>, Self: Sized + Into<i64> + From<i64> {
        use tap::Conv;
        (self.conv::<i64>() | perm.into().conv::<i64>()).into()
    }

    fn remove_perm<T>(self, perm: T) -> Self where T: Into<Self>, Self: Sized + Into<i64> + From<i64> {
        use tap::Conv;
        (self.conv::<i64>() & (-1i64 ^ perm.into().conv::<i64>())).into()
    }
}
