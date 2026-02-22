use sea_orm_migration::prelude::*;

#[derive(DeriveIden)]
pub enum Enum {
    #[sea_orm(iden = "edge_misc")]
    Table,
    EdgeId,
    From,
    To,
    EdgeType,
}
