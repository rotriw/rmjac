use core::error::CoreError;

use actix_cors::Cors;
use actix_web::{
    App, HttpResponse, HttpServer, error,
    http::{StatusCode, header::ContentType},
    web,
};
use derive_more::derive::Display;
use log::LevelFilter;
use sea_orm::{ConnectOptions, Database};

#[derive(Debug, Display)]
pub enum HttpError {
    #[display("(Core Error){}", _0)]
    CoreError(CoreError),
    #[display("IO Error")]
    IOError,
    #[display("Actix Error")]
    ActixError,
}

impl error::ResponseError for HttpError {
    fn error_response(&self) -> HttpResponse {
        HttpResponse::build(self.status_code())
            .insert_header(ContentType::json())
            .body(Json! {
                "error": self.to_string()
            })
    }

    fn status_code(&self) -> StatusCode {
        match *self {
            HttpError::CoreError(_) | HttpError::IOError | HttpError::ActixError => {
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
pub async fn main(host: &str, port: u16) -> std::io::Result<()> {
    let database_url = crate::env::CONFIG
        .lock()
        .unwrap()
        .postgres_url
        .clone()
        .ok_or_else(|| {
            std::io::Error::new(std::io::ErrorKind::NotFound, "Postgres URL not found")
        })?;
    log::info!("Connecting to database {}...", &database_url);
    let connection_options = ConnectOptions::new(database_url)
        .sqlx_logging_level(LevelFilter::Trace)
        .to_owned();
    let conn = Database::connect(connection_options).await.unwrap();
    log::info!("Connected to database");
    log::info!("Server is running on port {}", port);
    HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .max_age(3600);
        App::new()
            .service(user::service())
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
            .wrap(cors)
    })
    .bind((host, port))?
    .run()
    .await
}

pub mod user;
