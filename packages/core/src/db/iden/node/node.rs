use sea_orm::DeriveIden;

#[derive(DeriveIden)]
pub enum Node {
    #[sea_orm(iden = "node")]
    Table,
    #[sea_orm(iden = "node_id")]
    NodeId,
    #[sea_orm(iden = "node_type")]
    NodeType,
}
