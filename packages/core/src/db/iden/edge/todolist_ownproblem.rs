use sea_orm_migration::prelude::*;

#[derive(DeriveIden)]
pub enum Enum {
    #[sea_orm(iden = "edge_todo_list")]
    Table,
    EdgeId,
    Order,
    Description,
    ProblemIden,
}
