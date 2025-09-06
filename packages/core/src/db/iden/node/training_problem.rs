use sea_orm::DeriveIden;

#[derive(DeriveIden)]
pub enum TrainingProblem {
    #[sea_orm(iden = "node_training_problem")]
    Table,
    #[sea_orm(iden = "node_id")]
    NodeId,
    #[sea_orm(iden = "description")]
    Description,
}
