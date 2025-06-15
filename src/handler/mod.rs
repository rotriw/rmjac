use core::error::CoreError;

use actix_web::{error, web, App, HttpResponse, HttpServer, http::{header::ContentType, StatusCode}};
use derive_more::derive::Display;

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
            .body(Json!{
                "error": self.to_string()
            })
    }

    fn status_code(&self) -> StatusCode {
        match *self {
            HttpError::CoreError(_) | HttpError::IOError | HttpError::ActixError => StatusCode::INTERNAL_SERVER_ERROR,
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
    log::info!("Server is running on port {}", port);
    HttpServer::new(|| {
        App::new()
        .service(user::service())
        .app_data(web::JsonConfig::default().error_handler(|err, _req| {
            error::InternalError::from_response(
                "",
                HttpResponse::BadRequest()
                    .content_type("application/json")
                    .body(Json!{"code": -1, "msg": err.to_string()})
            ).into()
        }))
    })
    .bind((host, port))?
    .run()
    .await
}

pub mod user;