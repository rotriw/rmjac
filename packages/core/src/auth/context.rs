use crate::service::iden::get_node_ids_from_iden;
use crate::graph::node::Node;
use crate::Result;
use sea_orm::DatabaseConnection;
use std::collections::HashMap;
use super::utils::PermissionUtils;

/// 当前用户的认证上下文
#[derive(Debug, Clone)]
pub struct AuthContext {
    pub user_node_id: i64,
    pub user_iden: String,
    pub permissions: HashMap<String, Vec<i64>>, // resource_type -> [resource_ids]
}

impl AuthContext {
    pub fn new(user_node_id: i64, user_iden: String) -> Self {
        Self {
            user_node_id,
            user_iden,
            permissions: HashMap::new(),
        }
    }

    /// 检查用户是否对特定资源有权限
    pub async fn has_permission(
        &mut self,
        db: &DatabaseConnection,
        resource_node_id: i64,
        required_view_perm: Option<i64>,
        required_manage_perm: Option<i64>,
    ) -> Result<bool> {
        use crate::graph::edge::perm_view::ViewPerm;
        use crate::graph::edge::perm_manage::ManagePerm;

        // 转换权限类型
        let view_perm = required_view_perm.map(|_perm_value| ViewPerm::ReadProblem);
        let manage_perm = required_manage_perm.map(|_perm_value| ManagePerm::ManagePublicDescription);

        // 使用PermissionUtils检查权限
        let has_permission = PermissionUtils::check_user_permission(
            db,
            self.user_node_id,
            resource_node_id,
            view_perm,
            manage_perm,
        ).await?;

        // 如果有权限，记录并返回
        if has_permission {
            if view_perm.is_some() {
                self.add_permission("view", resource_node_id);
            }
            if manage_perm.is_some() {
                self.add_permission("manage", resource_node_id);
            }
        }

        Ok(has_permission)
    }

    fn add_permission(&mut self, resource_type: &str, resource_node_id: i64) {
        self.permissions
            .entry(resource_type.to_string())
            .or_default()
            .push(resource_node_id);
    }

    pub fn has_cached_permission(&self, resource_type: &str, resource_node_id: i64) -> bool {
        self.permissions
            .get(resource_type)
            .map(|resources| resources.contains(&resource_node_id))
            .unwrap_or(false)
    }
}

/// 身份验证管理器
pub struct AuthManager;

impl AuthManager {
    /// 从用户标识符创建认证上下文
    pub async fn create_context(
        db: &DatabaseConnection,
        _redis: &mut redis::Connection,
        user_iden: &str,
    ) -> Result<Option<AuthContext>> {
        let user_node_ids = get_node_ids_from_iden(user_iden, db, _redis).await?;
        if user_node_ids.is_empty() {
            return Ok(None);
        }

        let user_node_id = user_node_ids[0];
        Ok(Some(AuthContext::new(user_node_id, user_iden.to_string())))
    }

    /// 验证用户身份并获取权限
    pub async fn authenticate_user(
        db: &DatabaseConnection,
        _redis: &mut redis::Connection,
        token: &str,
    ) -> Result<Option<AuthContext>> {
        // 使用库函数从token获取用户
        use crate::service::iden::get_node_ids_from_iden;

        // 将token作为标识符查找对应的用户节点
        let user_node_ids = get_node_ids_from_iden(&format!("token/{}", token), db, _redis).await?;

        if let Some(&user_node_id) = user_node_ids.first() {
            // 通过用户节点ID获取用户信息
            use crate::graph::node::user::UserNode;
            match UserNode::from_db(db, user_node_id).await {
                Ok(user_node) => {
                    Ok(Some(AuthContext::new(user_node_id, user_node.public.iden.clone())))
                },
                Err(_) => Ok(None),
            }
        } else {
            Ok(None)
        }
    }

    /// 检查用户是否有特定类型的权限
    pub async fn check_user_permission(
        db: &DatabaseConnection,
        user_node_id: i64,
        resource_node_id: i64,
        required_view_perm: Option<i64>,
        required_manage_perm: Option<i64>,
    ) -> Result<bool> {
        use crate::graph::edge::perm_view::ViewPerm;
        use crate::graph::edge::perm_manage::ManagePerm;

        // 转换权限类型
        let view_perm = if let Some(_perm_value) = required_view_perm {
            Some(ViewPerm::ReadProblem) // 简化实现
        } else {
            None
        };

        let manage_perm = if let Some(_perm_value) = required_manage_perm {
            Some(ManagePerm::ManagePublicDescription) // 简化实现
        } else {
            None
        };

        // 使用PermissionUtils检查权限
        PermissionUtils::check_user_permission(
            db,
            user_node_id,
            resource_node_id,
            view_perm,
            manage_perm,
        ).await
    }
}