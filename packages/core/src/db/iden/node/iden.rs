use sea_orm::DeriveIden;

#[derive(DeriveIden)]
pub enum Iden {
    #[sea_orm(iden = "node_iden")]
    Table,
    #[sea_orm(iden = "node_id")]
    NodeId,
    #[sea_orm(iden = "iden")]
    Iden,
    #[sea_orm(iden = "weight")]
    Weight,
}
