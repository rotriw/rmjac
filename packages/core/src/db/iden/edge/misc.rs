use sea_orm::DeriveIden;

#[derive(DeriveIden)]
pub enum Misc {
    #[sea_orm(iden = "edge_misc")]
    Table,
    #[sea_orm(iden = "edge_id")]
    EdgeId,
    #[sea_orm(iden = "u_node_id")]
    UNodeId,
    #[sea_orm(iden = "v_node_id")]
    VNodeId,
    #[sea_orm(iden = "misc_type")]
    MiscType,
}
