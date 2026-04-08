use sea_orm_migration::prelude::*;

#[derive(DeriveIden)]
pub enum Enum {
    #[sea_orm(iden = "edge_event_problem")]
    Table,
    EdgeId,
    EventId,
    ProblemId,
    Iden,
}
