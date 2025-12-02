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
    #[display("Iden already exists")]
    IdenExist,
}

#[derive(Debug, Display, EnumConst)]
pub enum QueryNotFound {
    #[display("Problem IDEN not found")]
    ProblemIdenNotFound,
    #[display("IDEN not found")]
    IdenNotFound,
    #[display("Node not found")]
    NodeNotFound,
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
    #[display("Guard: {}", _0)]
    Guard(String),
    #[display("Vjudge Error: {}", _0)]
    VjudgeError(String),
}
impl From<&CoreError> for i64 {
    fn from(value: &CoreError) -> Self {
        match value {
            CoreError::StdError => 10500,
            CoreError::IOError(_) => 10501,
            CoreError::DbError(_) => 20500,
            CoreError::RedisError(_) => 21500,
            CoreError::UserNotFound => 60404,
            CoreError::UserIdenExists => 60403,
            CoreError::NotFound(_) => 40404,
            CoreError::QueryExists(data) => match data {
                QueryExists::RegisterIDENExist => 91404,
                QueryExists::RegisterEmailExist => 92404,
                QueryExists::ProblemExist => 91403,
                QueryExists::IdenExist => 92403,
            },
            CoreError::QueryNotFound(data) => match data {
                QueryNotFound::ProblemIdenNotFound => 70404,
                QueryNotFound::IdenNotFound => 71404,
                QueryNotFound::NodeNotFound => 72404,
            },
            CoreError::SerdeError(_) => 12500,
            CoreError::PGPError(_) => 13500,
            CoreError::StringError(_) => 99999,
            CoreError::InvalidFunction(_) => 99404,
            CoreError::Guard(_) => 100403,
            CoreError::VjudgeError(s) => {
                if s.contains("Guard") {
                    101403
                } else if s.contains("NotFound") && s.contains("User") {
                    61404
                } else {
                    99999
                }
            },
        }
    }
}

impl From<QueryNotFound> for CoreError {
    fn from(err: QueryNotFound) -> Self {
        CoreError::QueryNotFound(err)
    }
}

impl From<QueryExists> for CoreError {
    fn from(err: QueryExists) -> Self {
        CoreError::QueryExists(err)
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
