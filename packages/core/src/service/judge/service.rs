// TODO.
pub enum Range {
    All,
    Ids(Vec<u64>),
    Time(u64, u64)
}
pub trait SyncPlatform {
    type PlatformInfo;
    fn sync(&self, range: Range) -> Self::PlatformInfo;
}