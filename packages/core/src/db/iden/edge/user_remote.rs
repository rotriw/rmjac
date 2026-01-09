use sea_orm::DeriveIden;

#[derive(DeriveIden)]
pub enum UserRemote {
    #[sea_orm(iden = "edge_user_remote")]
    Table,
    #[sea_orm(iden = "edge_id")]
    EdgeId,
    #[sea_orm(iden = "u_node_id")]
    UNodeId,
    #[sea_orm(iden = "v_node_id")]
    VNodeId,
}
