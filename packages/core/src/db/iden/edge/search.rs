use sea_orm_migration::prelude::*;

#[derive(DeriveIden)]
pub enum Enum {
    #[sea_orm(iden = "edge_search")]
    Table,
    EdgeId,
    Difficulty,
    Content,
    Id,
    Name,
    Iden,
    Typed,
    Platform,
}
