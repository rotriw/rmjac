use sea_orm::DeriveIden;

#[derive(DeriveIden)]
pub enum Edge {
    #[sea_orm(iden = "edge")]
    Table,
    #[sea_orm(iden = "edge_id")]
    EdgeId,
    #[sea_orm(iden = "edge_type")]
    EdgeType,
}
