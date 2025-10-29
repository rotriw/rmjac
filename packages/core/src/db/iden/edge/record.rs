use sea_orm::DeriveIden;

#[derive(DeriveIden)]
pub enum Record {
    #[sea_orm(iden = "edge_record")]
    Table,
    #[sea_orm(iden = "edge_id")]
    EdgeId,
    #[sea_orm(iden = "u_node_id")]
    UNodeId,
    #[sea_orm(iden = "v_node_id")]
    VNodeId,
    #[sea_orm(iden = "record_status")]
    RecordStatus,
    #[sea_orm(iden = "code_length")]
    CodeLength,
    #[sea_orm(iden = "score")]
    Score,
    #[sea_orm(iden = "submit_time")]
    SubmitTime,
    #[sea_orm(iden = "platform")]
    Platform,
}