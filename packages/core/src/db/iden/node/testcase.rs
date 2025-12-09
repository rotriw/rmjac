use sea_orm::DeriveIden;

#[derive(DeriveIden)]
pub enum Testcase {
    #[sea_orm(iden = "node_testcase")]
    Table,
    #[sea_orm(iden = "node_id")]
    NodeId,
    #[sea_orm(iden = "time_limit")]
    TimeLimit,
    #[sea_orm(iden = "memory_limit")]
    MemoryLimit,
    #[sea_orm(iden = "in_file")]
    InFile,
    #[sea_orm(iden = "out_file")]
    OutFile,
    #[sea_orm(iden = "io_method")]
    IoMethod,
    #[sea_orm(iden = "diff_method")]
    DiffMethod,
    #[sea_orm(iden = "testcase_name")]
    TestcaseName,
}
