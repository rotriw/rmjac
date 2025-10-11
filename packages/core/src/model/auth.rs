use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// 权限检查结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionCheckResult {
    pub can_view: bool,
    pub can_manage: bool,
    pub view_permissions: Vec<String>,
    pub manage_permissions: Vec<String>,
}

/// 预定义的权限组合
pub struct PermissionPresets;

impl PermissionPresets {
    /// 题目创建者权限描述
    pub fn problem_creator_description() -> &'static str {
        "题目创建者拥有对题目的完整查看和管理权限"
    }

    /// 训练创建者权限描述
    pub fn training_creator_description() -> &'static str {
        "训练创建者拥有对训练的查看和管理权限"
    }

    /// 管理员权限描述
    pub fn admin_description() -> &'static str {
        "管理员拥有系统管理权限"
    }
}

/// 权限验证中间件需要的上下文
#[derive(Debug, Clone)]
pub struct AuthContext {
    pub user_node_id: i64,
    pub permissions: HashMap<String, Vec<String>>,
}

impl AuthContext {
    pub fn new(user_node_id: i64) -> Self {
        Self {
            user_node_id,
            permissions: HashMap::new(),
        }
    }

    pub fn add_permission(&mut self, resource_type: &str, permission: String) {
        self.permissions
            .entry(resource_type.to_string())
            .or_default()
            .push(permission);
    }

    pub fn has_permission(&self, resource_type: &str, permission: &str) -> bool {
        self.permissions
            .get(resource_type)
            .map(|perms| perms.contains(&permission.to_string()))
            .unwrap_or(false)
    }
}