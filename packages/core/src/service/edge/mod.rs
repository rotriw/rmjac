use crate::Result;
pub mod support;

pub trait EdgeRun<O> {
     fn run(&self) -> impl Future<Output = Result<O>>;
}