use sea_orm::DeriveIden;

#[derive(DeriveIden)]
pub enum Record {
    #[sea_orm(iden = "node_record")]
    Table,
    #[sea_orm(iden = "node_id")]
    NodeId,
    #[sea_orm(iden = "record_time")]
    RecordTime,
    #[sea_orm(iden = "record_update_time")]
    RecordUpdateTime,
    #[sea_orm(iden = "record_order")]
    RecordOrder,
    #[sea_orm(iden = "record_status")]
    RecordStatus,
    #[sea_orm(iden = "record_score")]
    RecordScore,
    #[sea_orm(iden = "record_platform")]
    RecordPlatform,
    #[sea_orm(iden = "record_url")]
    RecordUrl,
    #[sea_orm(iden = "statement_id")]
    StatementId,
    #[sea_orm(iden = "record_message")]
    RecordMessage,
    #[sea_orm(iden = "code")]
    Code,
    #[sea_orm(iden = "code_language")]
    CodeLanguage,
    #[sea_orm(iden = "public_status")]
    PublicStatus,
}
