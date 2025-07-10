use sea_orm::DeriveIden;

#[derive(DeriveIden)]
pub enum Pages {
    #[sea_orm(iden = "node_pages")]
    Table,
    #[sea_orm(iden = "node_id")]
    NodeId,
    #[sea_orm(iden = "iden")]
    Iden,
}
