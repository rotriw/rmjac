use strum::IntoEnumIterator;


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

// 现在写不下去了。优雅的写法先不急。
// impl From<i64> for I64 {
//     fn from(value: i64) -> Self {
//         I64(value)
//     }
// }

// impl From<I64> for i64 {
//     fn from(value: I64) -> Self {
//         value.0
//     }
// }


// pub struct I64(i64);

// pub trait Perms<T> where T: Sized + Perm {
    
// }

// impl IntoPermNumber<i64> for I64 {
//     fn into_perm_number(self) -> i64 {
//         self.0
//     }
// }

// impl<T, E> IntoPermNumber<T> for I64 where T: Perms<E> + IntoEnumIterator {
//     fn into(self) -> T {
//         let mut perms = T::iter().collect::<Vec<_>>();
//         for perm in perms.iter_mut() {
//             if self.0 & perm.clone().into() != 0 {
//                 *perm = perm.clone();
//             } else {
//                 *perm = T::default();
//             }
//         }
//         perms.into_iter().collect()
//     }
// }