use sea_orm::DeriveIden;

#[derive(DeriveIden)]
pub enum ProblemStatement {
    #[sea_orm(iden = "node_problem_statement")]
    Table,
    #[sea_orm(iden = "node_id")]
    NodeId,
    #[sea_orm(iden = "iden")]
    Iden,
    #[sea_orm(iden = "source")]
    Source,
    #[sea_orm(iden = "content")]
    Content,
    #[sea_orm(iden = "creation_time")]
    CreationTime,
    #[sea_orm(iden = "update_time")]
    UpdateTime,
}
