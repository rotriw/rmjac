use sea_orm_migration::prelude::*;
#[derive(DeriveIden)]
pub enum Enum {
    #[sea_orm(iden = "edge_problem")]
    Table,
    EdgeId,
    TimeLimit,
    MemoryLimit,
    Difficulty,
    Platform,
    Iden,
    Name,
    AuthorId
}