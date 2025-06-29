use derive_more::Display;
use enum_const::EnumConst;

#[derive(Debug, Display, EnumConst)]
pub enum QueryExists {
    #[display("User IDEN already exists")]
    RegisterIDENExist,
    #[display("User Email already exists")]
    RegisterEmailExist,
}

#[derive(Debug, Display, EnumConst)]
pub enum CoreError {
    #[display("Std Error")]
    StdError,
    #[display("Db Error(seaorm::error::DbErr): _{}", _0)]
    DbError(sea_orm::error::DbErr),
    #[display("User not found")]
    UserNotFound,
    #[display("User IDEN already exists")]
    UserIdenExists,
    #[display("_{}", _0)]
    QueryExists(QueryExists),
    #[display("NotFound Error: _{}", _0)]
    NotFound(String),
}

impl From<CoreError> for i64 {
    fn from(value: CoreError) -> Self {
        match value {
            CoreError::StdError => 10000,
            CoreError::DbError(_) => 20000,
            CoreError::UserNotFound => 3000,
            CoreError::UserIdenExists => 40000,
            CoreError::NotFound(_) => 50000,
            CoreError::QueryExists(data) => match data {
                QueryExists::RegisterIDENExist => 60001,
                QueryExists::RegisterEmailExist => 60002,
            },
        }
    }
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
