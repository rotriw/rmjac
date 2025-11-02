use enum_const::EnumConst;
use crate::{
    graph::edge::perm_problem::{PermProblemEdgeQuery, ProblemPerm},
    graph::edge::perm_pages::{PermPagesEdgeQuery, PagesPerm},
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
        problem_perm: Option<ProblemPerm>,
        pages_perm: Option<PagesPerm>,
    ) -> Result<bool> {
        let mut has_required_problem = true;
        let mut has_required_pages = true;

        // 检查题目权限
        if let Some(perm) = problem_perm {
            has_required_problem = match check_perm(
                db,
                user_node_id,
                resource_node_id,
                PermProblemEdgeQuery,
                perm.get_const_isize().unwrap() as i64,
            ).await? {
                1 => true,
                _ => false,
            };
        }

        // 检查页面权限
        if let Some(perm) = pages_perm {
            has_required_pages = match check_perm(
                db,
                user_node_id,
                resource_node_id,
                PermPagesEdgeQuery,
                perm.get_const_isize().unwrap() as i64,
            ).await? {
                1 => true,
                _ => false,
            };
        }

        // 必须满足所有要求的权限
        Ok(has_required_problem && has_required_pages)
    }

    /// 批量检查用户权限
    pub async fn check_user_permissions(
        db: &DatabaseConnection,
        user_node_id: i64,
        resource_node_ids: &[i64],
        problem_perm: Option<ProblemPerm>,
        pages_perm: Option<PagesPerm>,
    ) -> Result<HashMap<i64, bool>> {
        let mut results = HashMap::new();

        for &resource_node_id in resource_node_ids {
            let has_permission = Self::check_user_permission(
                db,
                user_node_id,
                resource_node_id,
                problem_perm,
                pages_perm,
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
        problem_perm: Option<ProblemPerm>,
        pages_perm: Option<PagesPerm>,
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
            problem_perm,
            pages_perm,
        ).await
    }

    /// 获取用户对所有资源的权限概览
    pub async fn get_user_permission_overview(
        db: &DatabaseConnection,
        user_node_id: i64,
    ) -> Result<UserPermissionOverview> {
        // 使用库函数获取用户的所有题目权限
        let problem_permissions = match PermProblemEdgeQuery::get_v(user_node_id, db).await {
            Ok(node_ids) => node_ids.len(),
            Err(e) => {
                log::error!("Failed to get problem permissions: {}", e);
                0
            }
        };

        // 使用库函数获取用户的所有页面权限
        let pages_permissions = match PermPagesEdgeQuery::get_v(user_node_id, db).await {
            Ok(node_ids) => node_ids.len(),
            Err(e) => {
                log::error!("Failed to get pages permissions: {}", e);
                0
            }
        };

        Ok(UserPermissionOverview {
            user_node_id,
            problem_resources: problem_permissions,
            pages_resources: pages_permissions,
            total_problem_permission_value: problem_permissions as i64,
            total_pages_permission_value: pages_permissions as i64,
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
            problem_perm: Option<ProblemPerm>,
            pages_perm: Option<PagesPerm>,
        ) -> Result<PermissionCheck> {
            // 检查缓存
            if let Some(cached) = self.cache.get(&resource_node_id) {
                return Ok(cached.clone());
            }

            // 执行权限检查
            let has_problem = if let Some(perm) = problem_perm {
                PermissionUtils::check_user_permission(db, self.user_node_id, resource_node_id, Some(perm), None).await?
            } else {
                true // 如果不要求题目权限，默认为有权限
            };

            let has_pages = if let Some(perm) = pages_perm {
                PermissionUtils::check_user_permission(db, self.user_node_id, resource_node_id, None, Some(perm)).await?
            } else {
                true // 如果不要求页面权限，默认为有权限
            };

            let check_result = PermissionCheck {
                resource_node_id,
                has_problem,
                has_pages,
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
            problem_perm: Option<ProblemPerm>,
            pages_perm: Option<PagesPerm>,
        ) -> Result<Vec<PermissionCheck>> {
            let mut results = Vec::new();

            for &resource_node_id in resource_node_ids {
                let check = self.check_resource(db, resource_node_id, problem_perm, pages_perm).await?;
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
    pub problem_resources: usize,
    pub pages_resources: usize,
    pub total_problem_permission_value: i64,
    pub total_pages_permission_value: i64,
}

/// 权限检查结果
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PermissionCheck {
    pub resource_node_id: i64,
    pub has_problem: bool,
    pub has_pages: bool,
}

/// 权限预设组合
pub struct PermissionPresets;

impl PermissionPresets {
    /// 题目读者权限
    pub fn problem_reader() -> (ProblemPerm, PagesPerm) {
        (ProblemPerm::ReadProblem, PagesPerm::ReadPages)
    }

    /// 题目作者权限
    pub fn problem_author() -> (ProblemPerm, PagesPerm) {
        (ProblemPerm::ReadProblem, PagesPerm::EditPages)
    }

    /// 训练参与者权限
    pub fn training_participant() -> (ProblemPerm, PagesPerm) {
        (ProblemPerm::ReadProblem, PagesPerm::ReadPages)
    }

    /// 训练组织者权限
    pub fn training_organizer() -> (ProblemPerm, PagesPerm) {
        (ProblemPerm::ReadProblem, PagesPerm::EditPages)
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
            Some(ProblemPerm::ReadProblem),
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
            Some(ProblemPerm::EditProblem),
            None,
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
            None,
            Some(PagesPerm::ReadPages),
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
            Some(PagesPerm::EditPages),
        ).await
    }
}