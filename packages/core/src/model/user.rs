use crate::graph::edge::perm_view::ViewPermRaw;
use crate::{
    db::{
        self,
        entity::{
            self,
            node::user::{get_user_by_email, get_user_by_iden},
        },
    },
    env,
    error::{CoreError, QueryExists},
    graph::{
        edge::{
            EdgeRaw, EdgeQuery,
            perm_manage::{ManagePermRaw, PermManageEdgeRaw},
            perm_view::PermViewEdgeRaw,
        },
        node::{
            Node, NodeRaw,
            token::{TokenNode, TokenNodePrivateRaw, TokenNodePublicRaw, TokenNodeRaw},
            user::{UserNode, UserNodePrivateRaw, UserNodePublicRaw, UserNodeRaw},
        },
    },
    utils::encrypt::encode_password,
    Result,
};
use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};
use tap::Conv;

pub async fn create_default_user(
    db: &DatabaseConnection,
    iden: &str,
    name: &str,
    email: &str,
    avatar: &str,
    password: &str,
) -> Result<UserNode, CoreError> {
    if entity::node::user::check_iden_exists(db, iden).await? {
        return Err(CoreError::QueryExists(QueryExists::RegisterIDENExist));
    }
    if entity::node::user::check_email_exists(db, email).await? {
        return Err(CoreError::QueryExists(QueryExists::RegisterEmailExist));
    }
    let user = UserNodeRaw {
        public: UserNodePublicRaw {
            name: name.to_string(),
            email: email.to_string(),
            iden: iden.to_string(),
            creation_time: chrono::Utc::now().naive_utc(),
            last_login_time: chrono::Utc::now().naive_utc(),
            avatar: avatar.to_string(),
        },
        private: UserNodePrivateRaw {
            password: encode_password(&password.to_string()),
        },
    };
    let result = user.save(db).await?;
    let default_node_id = env::DEFAULT_NODES.lock().unwrap().default_strategy_node;
    if default_node_id != -1 {
        PermViewEdgeRaw {
            u: result.node_id,
            v: default_node_id,
            perms: ViewPermRaw::All,
        }
        .save(db)
        .await?;
    } else {
        log::error!("Default strategy node not set, user will not have default permissions.");
    }
    Ok(result)
}

pub async fn check_iden_exists(db: &DatabaseConnection, iden: &str) -> Result<bool, CoreError> {
    let exists = entity::node::user::check_iden_exists(db, iden).await?;
    Ok(exists)
}

pub async fn user_login(
    db: &DatabaseConnection,
    iden: &str,
    password: &str,
    token_iden: &str,
    long_token: bool,
) -> Result<(UserNode, TokenNode), CoreError> {
    use db::entity::node::token::gen_token;

    let user = get_user_by_iden(db, iden).await;
    let user = if let Ok(user) = user {
        user
    } else {
        get_user_by_email(db, iden).await?
    }
    .conv::<UserNode>();
    if user.private.password != encode_password(&password.to_string()) {
        dbg!(
            user.private.password,
            encode_password(&password.to_string())
        );
        return Err(CoreError::UserNotFound);
    }
    let token_expiration = if long_token {
        Some((chrono::Utc::now() + chrono::Duration::days(30)).naive_utc())
    } else {
        None
    };
    let token = TokenNodeRaw {
        iden: token_iden.to_string(),
        service: "auth".to_string(),
        public: TokenNodePublicRaw {
            token_expiration,
            token_type: "auth".to_string(),
        },
        private: TokenNodePrivateRaw { token: gen_token() },
    }
    .save(db)
    .await?;
    PermViewEdgeRaw {
        u: token.node_id,
        v: user.node_id,
        perms: ViewPermRaw::All,
    }
    .save(db)
    .await?;
    PermManageEdgeRaw {
        u: token.node_id,
        v: user.node_id,
        perms: ManagePermRaw::All,
    }
    .save(db)
    .await?;
    Ok((user, token))
}

#[derive(Debug, Clone, Serialize, Deserialize)]
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

pub async fn change_user_config(
    db: &DatabaseConnection,
    node_id: i64,
    update_data: UserUpdateProps,
) -> Result<UserNode, CoreError> {
    
    let user = UserNode::from_db(db, node_id).await?;
    let active = update_data.into();
    user.modify_from_active_model(db, active).await?;
    Ok(user)
}

pub async fn change_user_password(
    db: &DatabaseConnection,
    node_id: i64,
    password: String,
) -> Result<UserNode, CoreError> {
    use db::entity::node::user::Column::UserPassword;
    let user = UserNode::from_db(db, node_id).await?;
    user.modify(db, UserPassword, encode_password(&password)).await?;
    Ok(user)
}

/// Delete all permission connections for a user (edges only)
/// This function removes all permission edges connected to a user while keeping the user node intact
pub async fn delete_user_connections(
    db: &DatabaseConnection,
    user_node_id: i64,
) -> Result<()> {
    log::info!("Starting to delete all connections for user node ID: {}", user_node_id);

    // Delete all outgoing perm_view edges (user -> resource) using EdgeQuery
    let perm_view_targets = crate::graph::edge::perm_view::PermViewEdgeQuery::get_v(user_node_id, db).await?;
    for target_node_id in perm_view_targets {
        crate::graph::edge::perm_view::PermViewEdgeQuery::delete(db, user_node_id, target_node_id).await?;
        log::debug!("Deleted perm_view edge: {} -> {}", user_node_id, target_node_id);
    }

    // Delete all incoming perm_view edges (token -> user) using EdgeQuery
    let perm_view_sources = crate::graph::edge::perm_view::PermViewEdgeQuery::get_u(user_node_id, db).await?;
    for source_node_id in perm_view_sources {
        crate::graph::edge::perm_view::PermViewEdgeQuery::delete(db, source_node_id, user_node_id).await?;
        log::debug!("Deleted incoming perm_view edge: {} -> {}", source_node_id, user_node_id);
    }

    // Delete all outgoing perm_manage edges (user -> resource) using EdgeQuery
    let perm_manage_targets = crate::graph::edge::perm_manage::PermManageEdgeQuery::get_v(user_node_id, db).await?;
    for target_node_id in perm_manage_targets {
        crate::graph::edge::perm_manage::PermManageEdgeQuery::delete(db, user_node_id, target_node_id).await?;
        log::debug!("Deleted perm_manage edge: {} -> {}", user_node_id, target_node_id);
    }

    // Delete all incoming perm_manage edges (token -> user) using EdgeQuery
    let perm_manage_sources = crate::graph::edge::perm_manage::PermManageEdgeQuery::get_u(user_node_id, db).await?;
    for source_node_id in perm_manage_sources {
        crate::graph::edge::perm_manage::PermManageEdgeQuery::delete(db, source_node_id, user_node_id).await?;
        log::debug!("Deleted incoming perm_manage edge: {} -> {}", source_node_id, user_node_id);
    }

    log::info!("Successfully deleted all connections for user node ID: {}", user_node_id);
    Ok(())
}

/// Remove a specific permission from a user to a resource (delete edge only)
pub async fn remove_user_view_permission(
    db: &DatabaseConnection,
    user_node_id: i64,
    resource_node_id: i64,
) -> Result<()> {
    log::info!("Removing view permission from user {} to resource {}", user_node_id, resource_node_id);

    // Delete the perm_view edge using EdgeQuery
    crate::graph::edge::perm_view::PermViewEdgeQuery::delete(db, user_node_id, resource_node_id).await?;

    log::info!("Successfully removed view permission from user {} to resource {}", user_node_id, resource_node_id);
    Ok(())
}

/// Remove a specific management permission from a user to a resource (delete edge only)
pub async fn remove_user_manage_permission(
    db: &DatabaseConnection,
    user_node_id: i64,
    resource_node_id: i64,
) -> Result<()> {
    log::info!("Removing manage permission from user {} to resource {}", user_node_id, resource_node_id);

    // Delete the perm_manage edge using EdgeQuery
    crate::graph::edge::perm_manage::PermManageEdgeQuery::delete(db, user_node_id, resource_node_id).await?;

    log::info!("Successfully removed manage permission from user {} to resource {}", user_node_id, resource_node_id);
    Ok(())
}

/// Revoke all tokens for a user (delete token-user edges only)
pub async fn revoke_all_user_tokens(
    db: &DatabaseConnection,
    user_node_id: i64,
) -> Result<()> {
    log::info!("Revoking all tokens for user node ID: {}", user_node_id);

    // Find all tokens that have permissions to this user (incoming perm_view and perm_manage edges)
    let token_sources_view = crate::graph::edge::perm_view::PermViewEdgeQuery::get_u(user_node_id, db).await?;
    let token_sources_manage = crate::graph::edge::perm_manage::PermManageEdgeQuery::get_u(user_node_id, db).await?;

    // Combine and deduplicate token node IDs
    let mut token_node_ids = token_sources_view.clone();
    token_node_ids.extend(token_sources_manage.clone());
    token_node_ids.sort();
    token_node_ids.dedup();

    // Delete all token-user permission edges
    for token_node_id in token_node_ids {
        // Delete perm_view edge (token -> user)
        if token_sources_view.contains(&token_node_id) {
            crate::graph::edge::perm_view::PermViewEdgeQuery::delete(db, token_node_id, user_node_id).await?;
            log::debug!("Deleted token-user perm_view edge: {} -> {}", token_node_id, user_node_id);
        }

        // Delete perm_manage edge (token -> user)
        if token_sources_manage.contains(&token_node_id) {
            crate::graph::edge::perm_manage::PermManageEdgeQuery::delete(db, token_node_id, user_node_id).await?;
            log::debug!("Deleted token-user perm_manage edge: {} -> {}", token_node_id, user_node_id);
        }
    }

    log::info!("Successfully revoked all tokens for user node ID: {}", user_node_id);
    Ok(())
}

