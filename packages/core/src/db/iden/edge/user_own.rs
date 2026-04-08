use sea_orm_migration::prelude::*;

#[derive(DeriveIden)]
pub enum Enum {
    #[sea_orm(iden = "edge_user_show")]
    Table,
    EdgeId,
    UserId,
    TaskId,
    Data,
    Order,
    Description,
    PublicHide,
}
