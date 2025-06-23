use sea_orm::DeriveIden;

#[derive(DeriveIden)]
pub enum Token {
    #[sea_orm(iden = "node_token")]
    Table,
    #[sea_orm(iden = "node_id")]
    NodeId,
    #[sea_orm(iden = "token")]
    Token,
    #[sea_orm(iden = "token_type")]
    TokenType,
    #[sea_orm(iden = "token_expiration")]
    TokenExpiration,
    #[sea_orm(iden = "service")]
    Service,
    #[sea_orm(iden = "token_iden")]
    TokenIden,
}
