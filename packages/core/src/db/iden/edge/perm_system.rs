use sea_orm_migration::prelude::*;

#[derive(DeriveIden)]
pub enum Enum {
    #[sea_orm(iden = "edge_perm_system")]
    Table,
    EdgeId,
    UNodeId,
    VNodeId,
    Perm
}