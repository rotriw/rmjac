use sea_orm::DeriveIden;

#[derive(DeriveIden)]
pub enum SubmitInfo {
    #[sea_orm(iden = "node_submit_info")]
    Table,
    #[sea_orm(iden = "node_id")]
    NodeId,
    #[sea_orm(iden = "option_data")]
    OptionData
}
