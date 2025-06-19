use sea_orm::DeriveIden;

#[derive(DeriveIden)]
pub enum User {
    #[sea_orm(iden = "user")]
    Table,
    #[sea_orm(iden = "node_id")]
    NodeId,
    #[sea_orm(iden = "user_name")]
    UserName,
    #[sea_orm(iden = "user_email")]
    UserEmail,
    #[sea_orm(iden = "user_password")]
    UserPassword,
    #[sea_orm(iden = "user_avatar")]
    UserAvatar,
    #[sea_orm(iden = "user_creation_time")]
    UserCreationTime,
    #[sea_orm(iden = "user_creation_order")]
    UserCreationOrder,
    #[sea_orm(iden = "user_last_login_time")]
    UserLastLoginTime,
    #[sea_orm(iden = "user_description")]
    UserDescription,
    #[sea_orm(iden = "user_iden")]
    UserIden,
    #[sea_orm(iden = "user_bio")]
    UserBio,
    #[sea_orm(iden = "user_profile_show")]
    UserProfileShow,
}
