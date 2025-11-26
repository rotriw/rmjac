use crate::utils::perm::{AuthTool, UserAuthCotext};
use rmjac_core::error::CoreError;

use actix_cors::Cors;
use actix_web::{App, HttpResponse, HttpServer, error, http::{StatusCode, header::ContentType}, web, HttpRequest};
use actix_web::http::header;
use derive_more::derive::Display;
use log::LevelFilter;
use sea_orm::{ConnectOptions, Database, DatabaseConnection};

#[derive(Debug, Display)]
pub enum HandlerError {
    #[display("Permission Denied")]
    PermissionDenied,
    #[display("Invalid Input: {}", _0)]
    InvalidInput(String),
    #[display("Not Found: {}", _0)]
    NotFound(String),
    #[display("Conflict: {}", _0)]
    Conflict(String),
}

pub struct BasicHandler {
    pub db: DatabaseConnection,
    pub user_context: Option<UserAuthCotext>,
    pub req: HttpRequest
}


#[derive(Debug, Display)]
pub enum HttpError {
    #[display("(Core Error){}", _0)]
    CoreError(CoreError),
    #[display("(Handler Error){}", _0)]
    HandlerError(HandlerError),
    #[display("IO Error")]
    IOError,
    #[display("Actix Error")]
    ActixError,
}

fn error_code(error: &HttpError) -> i64 {
    use tap::Conv;
    match error {
        HttpError::HandlerError(handler_error) => match handler_error {
            HandlerError::PermissionDenied => 100,
            HandlerError::InvalidInput(_) => 200,
            HandlerError::NotFound(_) => 300,
            HandlerError::Conflict(_) => 400,
        },
        HttpError::CoreError(core_error) => core_error.conv::<i64>(),
        HttpError::IOError => 500,
        HttpError::ActixError => 600,
    }
}

impl error::ResponseError for HttpError {
    fn error_response(&self) -> HttpResponse {
        HttpResponse::build(self.status_code())
            .insert_header(ContentType::json())
            .body(Json! {
                "code": error_code(self),
                "error": self.to_string(),
            })
    }

    fn status_code(&self) -> StatusCode {
        match *self {
            HttpError::HandlerError(HandlerError::PermissionDenied) => StatusCode::FORBIDDEN,
            HttpError::CoreError(_) | HttpError::IOError | HttpError::ActixError | HttpError::HandlerError(_) => {
                StatusCode::INTERNAL_SERVER_ERROR
            }
        }
    }
}

impl From<actix_web::Error> for HttpError {
    fn from(_error: actix_web::Error) -> Self {
        HttpError::ActixError
    }
}

impl From<CoreError> for HttpError {
    fn from(error: CoreError) -> Self {
        HttpError::CoreError(error)
    }
}

pub type ResultHandler<T> = Result<T, HttpError>;


#[actix_web::main]
pub async fn main(host: &str, port: u16, vjudge_port: u16, vjudge_auth: &str) -> std::io::Result<()> {
    let database_url = crate::env::CONFIG
        .lock()
        .unwrap()
        .postgres_url
        .clone()
        .ok_or_else(|| {
            std::io::Error::new(std::io::ErrorKind::NotFound, "Postgres URL not found")
        })?;
    let url = rmjac_core::env::REDIS_URL.lock().unwrap().clone();
    log::info!("connect to redis: {url}");
    *rmjac_core::env::REDIS_CLIENT.lock().unwrap() = redis::Client::open(url).unwrap();
    log::info!("Connecting to database {}...", &database_url);
    let connection_options = ConnectOptions::new(database_url.clone())
        .sqlx_logging_level(LevelFilter::Trace)
        .to_owned();
    let conn = Database::connect(connection_options).await.unwrap();
    log::info!("Connected to database");
    let data = rmjac_core::service::service_start(&conn, database_url.as_str(), "public", vjudge_port, vjudge_auth).await;
    if data.is_err() {
        log::error!("Failed to start service: {:?}", data.err());
    }
    log::info!("Server is running on port {port}");
    HttpServer::new(move || {
        let cors = Cors::default()
            .allowed_origin("http://localhost:3000")
            .allowed_methods(vec!["GET", "POST", "PUT", "DELETE", "OPTIONS"])
            .allowed_headers(vec![header::AUTHORIZATION, header::ACCEPT])
            .allowed_header(header::CONTENT_TYPE)
            .supports_credentials();
        let auth = AuthTool {};
        App::new()
            .service(user::service())
            .service(problem::service())
            .app_data(web::JsonConfig::default().error_handler(|err, _req| {
                error::InternalError::from_response(
                    "",
                    HttpResponse::BadRequest()
                        .content_type("application/json")
                        .body(Json! {"code": -1, "msg": err.to_string()}),
                )
                .into()
            }))
            .app_data(web::Data::new(conn.clone()))
            .wrap(auth)
            .wrap(cors)
    })
    .bind((host, port))?
    .run()
    .await
}

pub mod user;
pub mod problem;
// pub mod record;
pub mod training;