use derive_more::Display;

#[derive(Debug, Display)]
pub enum CoreError {
    #[display("Std Error")]
    StdError,
    #[display("Db Error(seaorm::error::DbErr): _{}", _0)]
    DbError(sea_orm::error::DbErr),
    #[display("DB Error: _{}", _0)]
    MongoError(String),
    #[display("User not found")]
    UserNotFound,
}

impl From<sea_orm::error::DbErr> for CoreError {
    fn from(err: sea_orm::error::DbErr) -> Self {
        CoreError::DbError(err)
    }
}

impl AsRef<str> for CoreError {
    fn as_ref(&self) -> &str {
        "error"
    }
}
