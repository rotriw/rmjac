use sea_orm::DeriveIden;

#[derive(DeriveIden)]
pub enum ProblemLimit {
    #[sea_orm(iden = "edge_problem_limit")]
    Table,
    #[sea_orm(iden = "edge_id")]
    EdgeId,
    #[sea_orm(iden = "u_node_id")]
    UNodeId,
    #[sea_orm(iden = "v_node_id")]
    VNodeId,
    #[sea_orm(iden = "time_limit")]
    TimeLimit,
    #[sea_orm(iden = "memory_limit")]
    MemoryLimit,
}
