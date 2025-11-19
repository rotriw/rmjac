use std::future::{ready, Ready};
use std::rc::Rc;
use actix_web::{dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform}, Error, HttpMessage};
use futures_util::future::LocalBoxFuture;
use rmjac_core::model::user::check_user_token;

pub struct AuthTool;
impl<S, B> Transform<S, ServiceRequest> for AuthTool
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type InitError = ();
    type Transform = AuthMiddleware<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(AuthMiddleware { service: Rc::new(service) }))
    }
}

pub struct AuthMiddleware<S> {
    service: Rc<S>,
}

#[derive(Debug, Clone)]
pub struct UserAuthCotext {
    pub user_id: i64,
    pub is_real: bool,
}

impl<S, B> Service<ServiceRequest> for AuthMiddleware<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let service = Rc::clone(&self.service);
        Box::pin(async move {
            let uid = req.cookie("_uid");
            let token = req.cookie("token");
            let mut user_id = -1;
            let mut is_real = false;
            if let Some(uid) = uid
                && let Some(token) = token
                && let Ok(uid) = uid.value().parse::<i64>()
            {
                let auth = check_user_token(uid, token.value()).await;
                if auth == true {
                    user_id = uid;
                    is_real = true;
                }
            }
            log::debug!("Auth Middleware: user_id={}, is_real={}", user_id, is_real);
            req.extensions_mut().insert(UserAuthCotext {
                user_id,
                is_real
            });
            Ok(service.call(req).await?)
        })
    }
}