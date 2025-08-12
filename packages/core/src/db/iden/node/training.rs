use sea_orm::DeriveIden;

#[derive(DeriveIden)]
pub enum Training {
    #[sea_orm(iden = "node_training")]
    Table,
    #[sea_orm(iden = "node_id")]
    NodeId,
    #[sea_orm(iden = "description_public")]
    DescriptionPublic,
    #[sea_orm(iden = "description_private")]
    DescriptionPrivate,
    #[sea_orm(iden = "start_time")]
    StartTime,
    #[sea_orm(iden = "end_time")]
    EndTime,
    #[sea_orm(iden = "training_type")]
    TrainingType,
}
