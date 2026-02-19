use sea_orm_migration::prelude::*;

#[derive(DeriveIden)]
pub enum Enum {
    #[sea_orm(table_name = "edge_perm_manage")]
    Table,
    EdgeId,
    UNodeId,
    VNodeId,
    Perm
}