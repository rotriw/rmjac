use core::error::CoreError;

use actix_web::{
    App, HttpResponse, HttpServer, error,
    http::{StatusCode, header::ContentType},
    web,
};
use derive_more::derive::Display;
use sea_orm::Database;

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
    log::info!("Connecting to database...");
    let database_url = crate::env::CONFIG
        .lock()
        .unwrap()
        .postgres_url
        .clone()
        .ok_or_else(|| {
            std::io::Error::new(std::io::ErrorKind::NotFound, "Postgres URL not found")
        })?;
    let conn = Database::connect(database_url.as_str()).await.unwrap();
    log::info!("Connected to database at {}", database_url);
    log::info!("Server is running on port {}", port);
    HttpServer::new(move || {
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
    })
    .bind((host, port))?
    .run()
    .await
}

pub mod user;
