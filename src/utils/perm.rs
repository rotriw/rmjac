use actix_web::{
    Error, HttpMessage,
    dev::{Service, ServiceRequest, ServiceResponse, Transform, forward_ready},
};
use futures_util::future::LocalBoxFuture;
use rmjac_core::model::user::User;
use std::future::{Ready, ready};
use std::rc::Rc;
use rmjac_core::default_node;
use rmjac_core::service::save::{ManageService, Saved};
use rmjac_core::service::user::VerifyLogin;

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
        ready(Ok(AuthMiddleware {
            service: Rc::new(service),
        }))
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
        use rmjac_core::Result;
        Box::pin(async move {
            let uid = req.cookie("_uid");
            let token = req.cookie("token");
            let mut user_id = -1;
            let mut is_real = false;
            if let Some(uid) = uid
                && let Some(token) = token
                && let Ok(uid) = uid.value().parse::<i64>()
            {
                let auth: Result<Saved<User>> = Saved::get(uid).await;
                if let Ok(auth) = auth {
                    if let Ok(x) = auth.verify_login(token.value()) && x {
                        user_id = uid;
                        is_real = true;
                    }
                }
            }
            if user_id == -1 {
                user_id = 3;
            }
            log::debug!("Auth Middleware: user_id={}, is_real={}", user_id, is_real);
            req.extensions_mut()
                .insert(UserAuthCotext { user_id, is_real });
            service.call(req).await
        })
    }
}
