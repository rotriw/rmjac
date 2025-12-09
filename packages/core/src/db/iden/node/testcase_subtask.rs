use sea_orm::DeriveIden;

#[derive(DeriveIden)]
pub enum TestcaseSubtask {
    #[sea_orm(iden = "node_testcase_subtask")]
    Table,
    #[sea_orm(iden = "node_id")]
    NodeId,
    #[sea_orm(iden = "subtask_id")]
    SubtaskId,
    #[sea_orm(iden = "time_limit")]
    TimeLimit,
    #[sea_orm(iden = "memory_limit")]
    MemoryLimit,
    #[sea_orm(iden = "subtask_calc_method")]
    SubtaskCalcMethod,
    #[sea_orm(iden = "subtask_calc_function")]
    SubtaskCalcFunction,
    #[sea_orm(iden = "is_root")]
    IsRoot,
}
