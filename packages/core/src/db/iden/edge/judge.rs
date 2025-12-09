use sea_orm::DeriveIden;

#[derive(DeriveIden)]
pub enum Judge {
    #[sea_orm(iden = "edge_judge")]
    Table,
    #[sea_orm(iden = "edge_id")]
    EdgeId,
    #[sea_orm(iden = "u_node_id")]
    UNodeId,
    #[sea_orm(iden = "v_node_id")]
    VNodeId,
    #[sea_orm(iden = "status")]
    Status,
    #[sea_orm(iden = "score")]
    Score,
    #[sea_orm(iden = "time")]
    Time,
    #[sea_orm(iden = "memory")]
    Memory,
}
