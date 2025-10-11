use enum_const::EnumConst;
use crate::{
    graph::edge::perm_view::{PermViewEdgeQuery, ViewPerm},
    graph::edge::perm_manage::{PermManageEdgeQuery, ManagePerm},
    graph::edge::EdgeQuery,
    service::iden::get_node_ids_from_iden,
    model::perm::check_perm,
    Result,
};
use sea_orm::DatabaseConnection;
use std::collections::HashMap;

/// 权限管理工具
pub struct PermissionUtils;

impl PermissionUtils {
    /// 检查用户是否对资源有特定权限
    pub async fn check_user_permission(
        db: &DatabaseConnection,
        user_node_id: i64,
        resource_node_id: i64,
        view_perm: Option<ViewPerm>,
        manage_perm: Option<ManagePerm>,
    ) -> Result<bool> {
        let mut has_required_view = true;
        let mut has_required_manage = true;

        // 检查查看权限
        if let Some(perm) = view_perm {
            has_required_view = match check_perm(
                db,
                user_node_id,
                resource_node_id,
                PermViewEdgeQuery,
                perm.get_const_isize().unwrap() as i64,
            ).await? {
                1 => true,
                _ => false,
            };
        }

        // 检查管理权限
        if let Some(perm) = manage_perm {
            has_required_manage = match check_perm(
                db,
                user_node_id,
                resource_node_id,
                PermManageEdgeQuery,
                perm.get_const_isize().unwrap() as i64,
            ).await? {
                1 => true,
                _ => false,
            };
        }

        // 必须满足所有要求的权限
        Ok(has_required_view && has_required_manage)
    }

    /// 批量检查用户权限
    pub async fn check_user_permissions(
        db: &DatabaseConnection,
        user_node_id: i64,
        resource_node_ids: &[i64],
        view_perm: Option<ViewPerm>,
        manage_perm: Option<ManagePerm>,
    ) -> Result<HashMap<i64, bool>> {
        let mut results = HashMap::new();

        for &resource_node_id in resource_node_ids {
            let has_permission = Self::check_user_permission(
                db,
                user_node_id,
                resource_node_id,
                view_perm,
                manage_perm,
            ).await?;
            results.insert(resource_node_id, has_permission);
        }

        Ok(results)
    }

    /// 通过标识符检查权限
    pub async fn check_permission_by_iden(
        db: &DatabaseConnection,
        redis: &mut redis::Connection,
        user_iden: &str,
        resource_iden: &str,
        view_perm: Option<ViewPerm>,
        manage_perm: Option<ManagePerm>,
    ) -> Result<bool> {
        // 获取用户节点ID
        let user_node_ids = get_node_ids_from_iden(user_iden, db, redis).await?;
        if user_node_ids.is_empty() {
            return Ok(false);
        }

        // 获取资源节点ID
        let resource_node_ids = get_node_ids_from_iden(resource_iden, db, redis).await?;
        if resource_node_ids.is_empty() {
            return Ok(false);
        }

        Self::check_user_permission(
            db,
            user_node_ids[0],
            resource_node_ids[0],
            view_perm,
            manage_perm,
        ).await
    }

    /// 获取用户对所有资源的权限概览
    pub async fn get_user_permission_overview(
        db: &DatabaseConnection,
        user_node_id: i64,
    ) -> Result<UserPermissionOverview> {
        // 使用库函数获取用户的所有查看权限
        let view_permissions = match PermViewEdgeQuery::get_v(user_node_id, db).await {
            Ok(node_ids) => node_ids.len(),
            Err(e) => {
                log::error!("Failed to get view permissions: {}", e);
                0
            }
        };

        // 使用库函数获取用户的所有管理权限
        let manage_permissions = match PermManageEdgeQuery::get_v(user_node_id, db).await {
            Ok(node_ids) => node_ids.len(),
            Err(e) => {
                log::error!("Failed to get manage permissions: {}", e);
                0
            }
        };

        Ok(UserPermissionOverview {
            user_node_id,
            view_resources: view_permissions,
            manage_resources: manage_permissions,
            total_view_permission_value: view_permissions as i64,
            total_manage_permission_value: manage_permissions as i64,
        })
    }
}

/// 资源权限分析器
pub struct ResourcePermissionAnalyzer {
    user_node_id: i64,
    cache: HashMap<i64, PermissionCheck>,
}

impl ResourcePermissionAnalyzer {
        pub fn new(user_node_id: i64) -> Self {
            Self {
                user_node_id,
                cache: HashMap::new(),
            }
        }

        /// 检查资源权限（带缓存）
        pub async fn check_resource(
            &mut self,
            db: &DatabaseConnection,
            resource_node_id: i64,
            view_perm: Option<ViewPerm>,
            manage_perm: Option<ManagePerm>,
        ) -> Result<PermissionCheck> {
            // 检查缓存
            if let Some(cached) = self.cache.get(&resource_node_id) {
                return Ok(cached.clone());
            }

            // 执行权限检查
            let has_view = if let Some(perm) = view_perm {
                PermissionUtils::check_user_permission(db, self.user_node_id, resource_node_id, Some(perm), None).await?
            } else {
                true // 如果不要求查看权限，默认为有权限
            };

            let has_manage = if let Some(perm) = manage_perm {
                PermissionUtils::check_user_permission(db, self.user_node_id, resource_node_id, None, Some(perm)).await?
            } else {
                true // 如果不要求管理权限，默认为有权限
            };

            let check_result = PermissionCheck {
                resource_node_id,
                has_view,
                has_manage,
            };

            // 缓存结果
            self.cache.insert(resource_node_id, check_result.clone());

            Ok(check_result)
        }

        /// 批量检查资源权限
        pub async fn check_resources(
            &mut self,
            db: &DatabaseConnection,
            resource_node_ids: &[i64],
            view_perm: Option<ViewPerm>,
            manage_perm: Option<ManagePerm>,
        ) -> Result<Vec<PermissionCheck>> {
            let mut results = Vec::new();

            for &resource_node_id in resource_node_ids {
                let check = self.check_resource(db, resource_node_id, view_perm, manage_perm).await?;
                results.push(check);
            }

            Ok(results)
        }

        /// 清除缓存
        pub fn clear_cache(&mut self) {
            self.cache.clear();
        }
    }

/// 用户权限概览
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct UserPermissionOverview {
    pub user_node_id: i64,
    pub view_resources: usize,
    pub manage_resources: usize,
    pub total_view_permission_value: i64,
    pub total_manage_permission_value: i64,
}

/// 权限检查结果
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PermissionCheck {
    pub resource_node_id: i64,
    pub has_view: bool,
    pub has_manage: bool,
}

/// 权限预设组合
pub struct PermissionPresets;

impl PermissionPresets {
    /// 题目读者权限
    pub fn problem_reader() -> (ViewPerm, ManagePerm) {
        (ViewPerm::ReadProblem, ManagePerm::ManagePublicDescription)
    }

    /// 题目作者权限
    pub fn problem_author() -> (ViewPerm, ManagePerm) {
        (ViewPerm::ReadProblem, ManagePerm::ManageStatement)
    }

    /// 训练参与者权限
    pub fn training_participant() -> (ViewPerm, ManagePerm) {
        (ViewPerm::ViewPublic, ManagePerm::ManagePublicDescription)
    }

    /// 训练组织者权限
    pub fn training_organizer() -> (ViewPerm, ManagePerm) {
        (ViewPerm::ViewPublic, ManagePerm::ManagePublicDescription)
    }
}

/// 常用权限检查函数
pub mod checks {
    use super::*;

    /// 检查是否可以读取题目
    pub async fn can_read_problem(
        db: &DatabaseConnection,
        user_node_id: i64,
        problem_node_id: i64,
    ) -> Result<bool> {
        PermissionUtils::check_user_permission(
            db,
            user_node_id,
            problem_node_id,
            Some(ViewPerm::ReadProblem),
            None,
        ).await
    }

    /// 检查是否可以管理题目
    pub async fn can_manage_problem(
        db: &DatabaseConnection,
        user_node_id: i64,
        problem_node_id: i64,
    ) -> Result<bool> {
        PermissionUtils::check_user_permission(
            db,
            user_node_id,
            problem_node_id,
            None,
            Some(ManagePerm::ManageStatement),
        ).await
    }

    /// 检查是否可以查看训练
    pub async fn can_view_training(
        db: &DatabaseConnection,
        user_node_id: i64,
        training_node_id: i64,
    ) -> Result<bool> {
        PermissionUtils::check_user_permission(
            db,
            user_node_id,
            training_node_id,
            Some(ViewPerm::ViewPublic),
            None,
        ).await
    }

    /// 检查是否可以管理训练
    pub async fn can_manage_training(
        db: &DatabaseConnection,
        user_node_id: i64,
        training_node_id: i64,
    ) -> Result<bool> {
        PermissionUtils::check_user_permission(
            db,
            user_node_id,
            training_node_id,
            None,
            Some(ManagePerm::ManagePublicDescription),
        ).await
    }
}