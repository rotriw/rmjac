use sea_orm::DeriveIden;

#[derive(DeriveIden)]
pub enum ProblemSource {
    #[sea_orm(iden = "node_problem_source")]
    Table,
    #[sea_orm(iden = "node_id")]
    NodeId,
    #[sea_orm(iden = "name")]
    Name,
    #[sea_orm(iden = "iden")]
    Iden,
}
