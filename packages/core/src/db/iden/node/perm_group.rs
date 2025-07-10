use sea_orm::DeriveIden;

#[derive(DeriveIden)]
pub enum PermGroup {
    #[sea_orm(iden = "node_perm_group")]
    Table,
    #[sea_orm(iden = "node_id")]
    NodeId,
    #[sea_orm(iden = "iden")]
    Iden,
}
