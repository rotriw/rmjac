use sea_orm::sea_query::{TableCreateStatement, TableDropStatement};

pub mod entity;
pub mod init;
pub mod iden;

pub struct EntityServer {
    pub name: &'static str,
    pub up: TableCreateStatement,
    pub down: TableDropStatement,
}

inventory::collect!(EntityServer);