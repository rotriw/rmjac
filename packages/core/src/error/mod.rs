use derive_more::Display;
use enum_const::EnumConst;
use pgp::errors::Error;
use redis::RedisError;

#[derive(Debug, Display, EnumConst)]
pub enum QueryExists {
    #[display("User IDEN already exists")]
    RegisterIDENExist,
    #[display("User Email already exists")]
    RegisterEmailExist,
    #[display("Problem already exists")]
    ProblemExist,
}

#[derive(Debug, Display, EnumConst)]
pub enum QueryNotFound {
    #[display("Problem IDEN not found")]
    ProblemIdenNotFound,
}

#[derive(Debug, Display, EnumConst)]
pub enum CoreError {
    #[display("Std Error")]
    StdError,
    #[display("Db Error(seaorm::error::DbErr): {}", _0)]
    DbError(sea_orm::error::DbErr),
    #[display("User not found")]
    UserNotFound,
    #[display("User IDEN already exists")]
    UserIdenExists,
    #[display("_{}", _0)]
    QueryExists(QueryExists),
    #[display("_{}", _0)]
    QueryNotFound(QueryNotFound),
    #[display("NotFound Error: {}", _0)]
    NotFound(String),
    #[display("Serde Error: {}", _0)]
    SerdeError(serde_json::Error),
    #[display("PGP Error: {}", _0)]
    PGPError(pgp::errors::Error),
    #[display("IO Error: {}", _0)]
    IOError(std::io::Error),
    #[display("Redis Error: {}", _0)]
    RedisError(RedisError),
    #[display("Error: {}", _0)]
    StringError(String),
    #[display("Invalid Function: {}", _0)]
    InvalidFunction(String),
}

impl From<&CoreError> for i64 {
    fn from(value: &CoreError) -> Self {
        match value {
            CoreError::StdError => 10000,
            CoreError::IOError(_) => 10001,
            CoreError::DbError(_) => 20000,
            CoreError::RedisError(_) => 21000,
            CoreError::UserNotFound => 60003,
            CoreError::UserIdenExists => 60004,
            CoreError::NotFound(_) => 50000,
            CoreError::QueryExists(data) => match data {
                QueryExists::RegisterIDENExist => 60001,
                QueryExists::RegisterEmailExist => 60002,
                QueryExists::ProblemExist => 60005,
            },
            CoreError::QueryNotFound(data) => match data {
                QueryNotFound::ProblemIdenNotFound => 61001,
            },
            CoreError::SerdeError(_) => 70000,
            CoreError::PGPError(_) => 75000,
            CoreError::StringError(_) => 80000,
            CoreError::InvalidFunction(_) => 80001,
        }
    }
}

impl From<std::io::Error> for CoreError {
    fn from(err: std::io::Error) -> Self {
        CoreError::IOError(err)
    }
}

impl From<pgp::errors::Error> for CoreError {
    fn from(err: Error) -> Self {
        CoreError::PGPError(err)
    }
}

impl From<RedisError> for CoreError {
    fn from(err: RedisError) -> Self {
        CoreError::RedisError(err)
    }
}

impl From<serde_json::Error> for CoreError {
    fn from(err: serde_json::Error) -> Self {
        CoreError::SerdeError(err)
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
