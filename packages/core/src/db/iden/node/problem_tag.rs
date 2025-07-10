use sea_orm::DeriveIden;

#[derive(DeriveIden)]
pub enum ProblemTag {
    #[sea_orm(iden = "node_problem_tag")]
    Table,
    #[sea_orm(iden = "node_id")]
    NodeId,
    #[sea_orm(iden = "tag_name")]
    TagName,
    #[sea_orm(iden = "tag_description")]
    TagDescription,
}
