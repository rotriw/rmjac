use crate::error::CoreError::QueryExists;
use crate::error::QueryExists::{RegisterEmailExist, RegisterIDENExist};
use crate::utils::get_redis_connection;
use crate::{
    Result,
    db::{
        self,
        entity::{
            self,
            node::user::{get_user_by_email, get_user_by_iden},
        },
    },
    env,
    error::CoreError,
    graph::node::{
            Node, NodeRaw,
            token::{TokenNode, TokenNodePrivateRaw, TokenNodePublicRaw, TokenNodeRaw},
            user::{UserNode, UserNodePrivateRaw, UserNodePublicRaw, UserNodeRaw},
        },
    utils::encrypt::encode_password,
};
use redis::TypedCommands;
use sea_orm::{DatabaseConnection, Set};
use serde::{Deserialize, Serialize};
use tap::Conv;
use crate::service::perm::provider::{PagesPermService, ProblemPermService, SystemPermService};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserRaw {
    pub iden: String,
    pub name: String,
    pub email: String,
    pub avatar: String,
    pub password: String,
}

impl UserRaw {
    /// Create a new UserRaw instance
    pub fn new(
        iden: String,
        name: String,
        email: String,
        avatar: String,
        password: String,
    ) -> Self {
        Self {
            iden,
            name,
            email,
            avatar,
            password,
        }
    }

    /// Check if user already exists in the database
    async fn check_exists(&self, db: &DatabaseConnection) -> Result<()> {
        if entity::node::user::check_email_exists(db, &self.email).await? {
            Err(QueryExists(RegisterEmailExist))
        } else if entity::node::user::check_iden_exists(db, &self.iden).await? {
            Err(QueryExists(RegisterIDENExist))
        } else {
            Ok(())
        }
    }

    /// Create a new UserNode in the database and assign default permissions
    pub async fn save(&self, db: &DatabaseConnection) -> Result<UserNode> {
        self.check_exists(db).await?;

        let user = UserNodeRaw {
            public: UserNodePublicRaw {
                name: self.name.to_string(),
                email: self.email.to_string(),
                iden: self.iden.to_string(),
                creation_time: chrono::Utc::now().naive_utc(),
                last_login_time: chrono::Utc::now().naive_utc(),
                avatar: self.avatar.to_string(),
            },
            private: UserNodePrivateRaw {
                password: encode_password(&self.password),
            },
        }
        .save(db)
        .await?;

        self.assign_default_permissions(&user, db).await?;
        Ok(user)
    }

    /// Assign default strategy permissions to newly created user
    async fn assign_default_permissions(
        &self,
        user: &UserNode,
        db: &DatabaseConnection,
    ) -> Result<()> {
        let default_node_id = env::DEFAULT_NODES.lock().unwrap().default_strategy_node;
        if default_node_id != -1 {
            PagesPermService::add(user.node_id, default_node_id, -1, db).await;
            ProblemPermService::add(user.node_id, default_node_id, -1, db).await;
            SystemPermService::add(user.node_id, default_node_id, -1, db).await;
        } else {
            log::warn!("Default strategy node not set, user will not have default permissions.");
        }
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct User {
    pub node_id: i64,
    pub user_node: Option<UserNode>,
}

#[derive(Serialize, Clone, ts_rs::TS)]
#[ts(export)]
pub struct SidebarItem {
    pub title: String,
    pub url: String,
    pub show: Option<String>,
    pub reg: Option<String>,
    pub icon: String,
    pub number: Option<i64>,
}


pub struct Token {
    pub node_id: i64,
    pub token: TokenNode,
}

impl User {
    pub fn new(id: i64) -> Self {
        Self {
            node_id: id,
            user_node: None,
        }
    }

    pub async fn load(&mut self, db: &DatabaseConnection) -> Result<()> {
        let user = UserNode::from_db(db, self.node_id).await?;
        self.user_node = Some(user);
        Ok(())
    }

    pub async fn get_node(&mut self, db: &DatabaseConnection) -> Result<&UserNode> {
        if self.user_node.is_none() {
            self.load(db).await?;
        }
        Ok(self.user_node.as_ref().unwrap())
    }

    pub async fn identifier_exists(db: &DatabaseConnection, iden: &str) -> Result<bool> {
        entity::node::user::check_iden_exists(db, iden).await
    }

    pub async fn update_config(
        &self,
        db: &DatabaseConnection,
        update_data: UserUpdateProps,
    ) -> Result<UserNode> {
        let user = UserNode::from_db(db, self.node_id).await?;
        use db::entity::node::user::ActiveModel;
        let mut active: ActiveModel = update_data.into();
        active.node_id = Set(self.node_id);
        user.modify_from_active_model(db, active).await?;
        Ok(user)
    }

    pub async fn change_password(
        &self,
        db: &DatabaseConnection,
        password: String,
    ) -> Result<UserNode> {
        use db::entity::node::user::Column::UserPassword;
        let user = UserNode::from_db(db, self.node_id).await?;
        user.modify(db, UserPassword, encode_password(&password))
            .await?;
        Ok(user)
    }

    pub async fn revoke_all_tokens(&self, db: &DatabaseConnection) -> Result<()> {
        UserTokenService::revoke_all(db, self.node_id).await
    }

    pub async fn delete_all_connections(&self, db: &DatabaseConnection) -> Result<()> {
        UserPermissionService::delete_all_connections(db, self.node_id).await
    }

    pub async fn remove_view_permission(
        &self,
        db: &DatabaseConnection,
        resource_node_id: i64,
    ) -> Result<()> {
        UserPermissionService::remove_view_permission(db, self.node_id, resource_node_id).await
    }

    pub async fn remove_manage_permission(
        &self,
        db: &DatabaseConnection,
        resource_node_id: i64,
    ) -> Result<()> {
        UserPermissionService::remove_manage_permission(db, self.node_id, resource_node_id).await
    }
}

pub struct LoginUser {
    pub user: User,
    pub token: Token,
}

impl LoginUser {
    pub fn new(user: User, token: Token) -> Self {
        Self { user, token }
    }

    pub fn into_user(self) -> User {
        self.user
    }

    pub fn user(&self) -> &User {
        &self.user
    }

    pub fn token(&self) -> &Token {
        &self.token
    }
}

impl From<LoginUser> for User {
    fn from(v: LoginUser) -> User {
        v.user
    }
}

pub struct UserAuthService;

impl UserAuthService {
    pub async fn login(
        db: &DatabaseConnection,
        redis: &mut redis::Connection,
        iden: &str,
        password: &str,
        token_iden: &str,
        long_token: bool,
    ) -> Result<(UserNode, TokenNode)> {
        let user = Self::get_user_by_iden_or_email(db, iden).await?;

        if user.private.password != encode_password(&password.to_string()) {
            return Err(CoreError::UserNotFound);
        }

        let token = Self::create_token(db, token_iden, long_token).await?;
        Self::store_token_in_redis(redis, &user, &token)?;

        Ok((user, token))
    }

    async fn get_user_by_iden_or_email(db: &DatabaseConnection, iden: &str) -> Result<UserNode> {
        match get_user_by_iden(db, iden).await {
            Ok(user) => Ok(user.conv::<UserNode>()),
            Err(_) => get_user_by_email(db, iden)
                .await
                .map(|u| u.conv::<UserNode>()),
        }
    }

    async fn create_token(
        db: &DatabaseConnection,
        token_iden: &str,
        long_token: bool,
    ) -> Result<TokenNode> {
        use db::entity::node::token::gen_token;

        let token_expiration = if long_token {
            Some((chrono::Utc::now() + chrono::Duration::days(30)).naive_utc())
        } else {
            None
        };

        TokenNodeRaw {
            iden: token_iden.to_string(),
            service: "auth".to_string(),
            public: TokenNodePublicRaw {
                token_expiration,
                token_type: "auth".to_string(),
            },
            private: TokenNodePrivateRaw { token: gen_token() },
        }
        .save(db)
        .await
    }

    fn store_token_in_redis(
        redis: &mut redis::Connection,
        user: &UserNode,
        token: &TokenNode,
    ) -> Result<()> {
        let redis_key = format!("user_token:{}:{}", user.node_id, token.private.token);
        let redis_value = user.node_id.to_string();
        let redis_expiration = 24 * 3600;
        redis
            .set_ex(redis_key, redis_value, redis_expiration)
            .map_err(Into::into)
    }

    pub async fn check_token(user_id: i64, user_token: &str) -> bool {
        let mut redis = get_redis_connection();
        let data = redis.get(format!("user_token:{}:{}", user_id, user_token));
        if let Ok(data) = data
            && let Some(data) = data
            && let Ok(data) = data.parse::<i64>()
        {
            data == user_id
        } else {
            false
        }
    }
}

pub struct UserPermissionService;

impl UserPermissionService {
    pub async fn delete_all_connections(db: &DatabaseConnection, user_node_id: i64) -> Result<()> {
        log::info!(
            "Deleting all permission connections for user node ID: {}",
            user_node_id
        );

        Self::delete_all_view_edges(db, user_node_id).await?;
        Self::delete_all_manage_edges(db, user_node_id).await?;

        log::info!(
            "Successfully deleted all connections for user node ID: {}",
            user_node_id
        );
        Ok(())
    }

    async fn delete_all_view_edges(db: &DatabaseConnection, user_node_id: i64) -> Result<()> {
        let targets =
            crate::graph::edge::perm_view::PermViewEdgeQuery::get_v(user_node_id, db).await?;
        for target in targets {
            crate::graph::edge::perm_view::PermViewEdgeQuery::delete(db, user_node_id, target)
                .await?;
        }

        let sources =
            crate::graph::edge::perm_view::PermViewEdgeQuery::get_u(user_node_id, db).await?;
        for source in sources {
            crate::graph::edge::perm_view::PermViewEdgeQuery::delete(db, source, user_node_id)
                .await?;
        }

        Ok(())
    }

    async fn delete_all_manage_edges(db: &DatabaseConnection, user_node_id: i64) -> Result<()> {
        let targets =
            crate::graph::edge::perm_manage::PermManageEdgeQuery::get_v(user_node_id, db).await?;
        for target in targets {
            crate::graph::edge::perm_manage::PermManageEdgeQuery::delete(db, user_node_id, target)
                .await?;
        }

        let sources =
            crate::graph::edge::perm_manage::PermManageEdgeQuery::get_u(user_node_id, db).await?;
        for source in sources {
            crate::graph::edge::perm_manage::PermManageEdgeQuery::delete(db, source, user_node_id)
                .await?;
        }

        Ok(())
    }

    pub async fn remove_view_permission(
        db: &DatabaseConnection,
        user_node_id: i64,
        resource_node_id: i64,
    ) -> Result<()> {
        log::info!(
            "Removing view permission from user {} to resource {}",
            user_node_id,
            resource_node_id
        );
        crate::graph::edge::perm_view::PermViewEdgeQuery::delete(
            db,
            user_node_id,
            resource_node_id,
        )
        .await?;
        Ok(())
    }

    pub async fn remove_manage_permission(
        db: &DatabaseConnection,
        user_node_id: i64,
        resource_node_id: i64,
    ) -> Result<()> {
        log::info!(
            "Removing manage permission from user {} to resource {}",
            user_node_id,
            resource_node_id
        );
        crate::graph::edge::perm_manage::PermManageEdgeQuery::delete(
            db,
            user_node_id,
            resource_node_id,
        )
        .await?;
        Ok(())
    }
}

pub struct UserTokenService;

impl UserTokenService {
    pub async fn revoke_all(db: &DatabaseConnection, user_node_id: i64) -> Result<()> {
        log::info!("Revoking all tokens for user node ID: {}", user_node_id);

        let token_sources_view =
            crate::graph::edge::perm_view::PermViewEdgeQuery::get_u(user_node_id, db).await?;
        let token_sources_manage =
            crate::graph::edge::perm_manage::PermManageEdgeQuery::get_u(user_node_id, db).await?;

        let mut token_node_ids = token_sources_view.clone();
        token_node_ids.extend(token_sources_manage.clone());
        token_node_ids.sort();
        token_node_ids.dedup();

        for token_node_id in token_node_ids {
            if token_sources_view.contains(&token_node_id) {
                crate::graph::edge::perm_view::PermViewEdgeQuery::delete(
                    db,
                    token_node_id,
                    user_node_id,
                )
                .await?;
            }
            if token_sources_manage.contains(&token_node_id) {
                crate::graph::edge::perm_manage::PermManageEdgeQuery::delete(
                    db,
                    token_node_id,
                    user_node_id,
                )
                .await?;
            }
        }

        log::info!(
            "Successfully revoked all tokens for user node ID: {}",
            user_node_id
        );
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS, Default)]
#[ts(export)]
pub struct UserUpdateProps {
    pub name: Option<String>,
    pub email: Option<String>,
    pub avatar: Option<String>,
    pub description: Option<String>,
    pub bio: Option<String>,
    pub user_profile_show: Option<String>,
}

impl From<UserUpdateProps> for db::entity::node::user::ActiveModel {
    fn from(value: UserUpdateProps) -> Self {
        use sea_orm::ActiveValue::{NotSet, Set};

        Self {
            node_id: NotSet,
            user_name: value.name.map(Set).unwrap_or(NotSet),
            user_email: value.email.map(Set).unwrap_or(NotSet),
            user_avatar: value.avatar.map(Set).unwrap_or(NotSet),
            user_description: value.description.map(Some).map(Set).unwrap_or(NotSet),
            user_bio: value.bio.map(Some).map(Set).unwrap_or(NotSet),
            user_profile_show: value.user_profile_show.map(Some).map(Set).unwrap_or(NotSet),
            user_password: NotSet,
            user_iden: NotSet,
            user_creation_time: NotSet,
            user_last_login_time: NotSet,
            user_creation_order: NotSet,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct SimplyUser {
    pub node_id: i64,
    pub avatar: String,
    pub name: String,
    pub iden: String,
    pub description: String,
}

#[derive(Deserialize, Clone, Serialize, ts_rs::TS)]
#[ts(export)]
pub struct UserCreaterUserVerify {
    pub challenge_text: String,
    pub challenge_darkmode: String,
    pub challenge_code: String,
    pub challenge_time: i64,
}

impl SimplyUser {
    pub fn new(node_id: i64, avatar: String, name: String, iden: String, description: String) -> Self {
        Self {
            node_id,
            avatar,
            name,
            iden,
            description
        }
    }

    pub async fn load(db: &DatabaseConnection, node_id: i64) -> Result<Self> {
        let user = UserNode::from_db(db, node_id).await?;
        Ok(Self::new(
            user.node_id,
            user.public.avatar,
            user.public.name,
            user.public.iden,
            user.public.description
        ))
    }
}
