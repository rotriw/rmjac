use sea_orm::DeriveIden;

#[derive(DeriveIden)]
pub enum VjudgeTask {
    #[sea_orm(iden = "node_vjudge_task")]
    Table,
    #[sea_orm(iden = "node_id")]
    NodeId,
    #[sea_orm(iden = "status")]
    Status,
    #[sea_orm(iden = "log")]
    Log,
    #[sea_orm(iden = "service_name")]
    ServiceName,
    #[sea_orm(iden = "workflow_snapshot")]
    WorkflowSnapshot,
    #[sea_orm(iden = "created_at")]
    CreatedAt,
    #[sea_orm(iden = "updated_at")]
    UpdatedAt,
}
