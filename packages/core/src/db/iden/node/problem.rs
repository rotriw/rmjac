use sea_orm::DeriveIden;

#[derive(DeriveIden)]
pub enum Problem {
    #[sea_orm(iden = "node_problem")]
    Table,
    #[sea_orm(iden = "node_id")]
    NodeId,
    #[sea_orm(iden = "content_public")]
    ContentPublic,
    #[sea_orm(iden = "content_private")]
    ContentPrivate,
    #[sea_orm(iden = "name")]
    Name,
    #[sea_orm(iden = "creation_time")]
    CreationTime,
    #[sea_orm(iden = "creation_order")]
    CreationOrder,
}
