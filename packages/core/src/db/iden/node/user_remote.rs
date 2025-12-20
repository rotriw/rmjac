use sea_orm::DeriveIden;

#[derive(DeriveIden)]
pub enum Vjudge {
    #[sea_orm(iden = "node_user_remote")]
    Table,
    #[sea_orm(iden = "node_id")]
    NodeId,
    #[sea_orm(iden = "user_iden")]
    UserIden,
    #[sea_orm(iden = "platform")]
    Platform,
    #[sea_orm(iden = "verified_code")]
    VerifiedCode,
    #[sea_orm(iden = "verified")]
    Verified,
    #[sea_orm(iden = "auth")]
    Auth,
    #[sea_orm(iden = "use_mode")]
    UseMode,
    #[sea_orm(iden = "creation_time")]
    CreationTime,
    #[sea_orm(iden = "updated_at")]
    UpdatedAt,
}
