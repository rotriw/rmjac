use crate::handler::{HttpError, ResultHandler, UserAuthCotext};
use macro_handler::{export, from_path, generate_handler, handler, route};
use rmjac_core::model::ModelStore;
use rmjac_core::model::submit::SubmissionService;

#[generate_handler(route = "/options", real_path = "/api/submit/options")]
pub mod handler {
    use rmjac_core::service::judge::service::LanguageChoiceInformation;

    use super::*;
    use crate::handler::UserAuthCotext;

    #[from_path(platform)]
    #[export(platform_str)]
    async fn before_resolve(platform: &str) -> ResultHandler<String> {
        Ok(platform.to_string())
    }

    #[handler]
    #[route("/{platform}")]
    #[export("options")]
    async fn get_options(
        store: &mut impl ModelStore,
        platform_str: String,
        sid: i64,
    ) -> ResultHandler<Vec<LanguageChoiceInformation>> {
        let options = SubmissionService::allowed_methods(store, &platform_str)
            .await
            .map_err(HttpError::CoreError)?;
        let default_options = SubmissionService::default_options(store, sid).await?;
        for cs in &default_options {
            log::info!("{} !!", &cs.0);
        }
        let res_options = options.into_iter().map(|f| {
            let mut allow_option = f.allow_option;
            allow_option.retain(|v| {
                !default_options.contains_key(&v.name)
            });
            LanguageChoiceInformation {
                name: f.name,
                allow_option,
            }
        }).collect();
        Ok(res_options)
    }
}
