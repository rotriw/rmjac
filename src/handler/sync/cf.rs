use crate::handler::{HttpError, ResultHandler};
use macro_handler::{export, from_path, generate_handler, handler, route};

#[generate_handler(route = "/cf", real_path = "/api/sync/cf")]
pub mod handler {
    use macro_handler::require_login;
    use rmjac_core::action::remotejudge::update_codeforces_sync;

    use super::*;
    use crate::handler::UserAuthCotext;

    #[handler]
    #[route("/all")]
    #[require_login]
    #[export("message")]
    async fn post_update_all(
        key: &str,
        secret: &str,
        handle: &str,
        user_context: UserAuthCotext,
        db: &sea_orm::DatabaseConnection,
    ) -> ResultHandler<()> {
        let ndb = db.clone();
        let uid = user_context.user_id;
        let key = key.to_string();
        let secret = secret.to_string();
        let handle = handle.to_string();
        tokio::spawn(async move {
            update_codeforces_sync(
                &ndb,
                &key,
                &secret,
                &handle,
                rmjac_core::service::edge::Range::All,
                true,
                uid,
            )
            .await;
        });
        Ok(())
    }
}
