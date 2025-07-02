#[derive(sea_orm::DeriveIden)]
pub enum ProblemLimit {
    #[sea_orm(iden = "node_problem_limit")]
    Table,
    #[sea_orm(iden = "node_id")]
    NodeId,
    #[sea_orm(iden = "node_iden")]
    NodeIden,
    #[sea_orm(iden = "time_limit")]
    TimeLimit,
    #[sea_orm(iden = "memory_limit")]
    MemoryLimit,
}