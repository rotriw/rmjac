use sea_orm_migration::prelude::*;

#[derive(DeriveIden)]
pub enum Enum {
    #[sea_orm(iden = "edge_record")]
    Table,
    EdgeId,
    Time,
    Memory,
    UserId,
    ProblemId,
    Code,
    RecordId,
    Status,
    Language,
    Score,
}
