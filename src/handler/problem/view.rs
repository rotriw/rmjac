use crate::handler::problem::RecordEdgeColumn;
use crate::handler::problem::RecordStatus;
use crate::handler::{BasicHandler, ResultHandler};
use enum_const::EnumConst;
use macro_handler::generate_handler;
use macro_handler::{export, from_path, handler, perm, route};
use rmjac_core::model::ModelStore;
use rmjac_core::model::problem::ProblemRepository;
use rmjac_core::model::record::RecordRepository;
use rmjac_core::model::problem::ProblemModel;
use rmjac_core::service::perm::provider::{Problem, ProblemPermService};
use sea_orm::ColumnTrait;
use tap::Conv;

#[generate_handler(route = "/view", real_path = "/api/problem/view")]
pub mod handler {
    use crate::utils::perm::UserAuthCotext;
    use rmjac_core::graph::edge::record::RecordEdge;
    use super::*;

    #[from_path(iden)]
    #[export(pid, stmtid)]
    async fn before_resolve(store: &mut impl ModelStore, iden: &str) -> ResultHandler<(i64, i64)> {
        Ok(ProblemRepository::resolve(store, iden).await?)
    }

    #[perm]
    async fn check_view_perm(user_context: Option<UserAuthCotext>, pid: i64) -> bool {
        // 如果用户已登录，检查是否有查看权限
        if let Some(uc) = user_context && uc.is_real {
            if ProblemPermService.verify(uc.user_id, pid, Problem::View) {
                return true;
            }
        }
        // 检查题目是否公开可见（使用特殊的公开用户ID 0）
        ProblemPermService.verify(default_node!(guest_user_node), pid, Problem::View)
    }

    #[handler]
    #[perm(check_view_perm)]
    #[route("/{iden}")]
    #[export("model", "statement", "user_recent_records", "user_last_accepted_record")]
    async fn get_view(
        store: &mut impl ModelStore,
        user_context: Option<UserAuthCotext>,
        pid: i64,
        stmtid: i64,
    ) -> ResultHandler<(ProblemModel, i64, Option<Vec<RecordEdge>>, Option<Vec<RecordEdge>>)> {
        let model = ProblemRepository::model(store, pid).await?;
        let get_user_submit_data = if let Some(uc) = &user_context
            && uc.is_real
        {
            let data =
                RecordRepository::by_user_statement(store.get_db(), uc.user_id, stmtid, 100, 1)
                    .await;
            data.ok()
        } else {
            None
        };
        let get_user_accepted_data = if let Some(uc) = &user_context
            && uc.is_real
        {
            Some(
                RecordRepository::by_node(
                    store.get_db(),
                    uc.user_id,
                    1,
                    1,
                    vec![
                        RecordEdgeColumn::RecordStatus
                            .eq(RecordStatus::Accepted.get_const_isize().unwrap_or(100) as i32),
                    ],
                )
                .await?,
            )
        } else {
            None
        };
        Ok((model, stmtid, get_user_submit_data, get_user_accepted_data))
    }

    #[handler]
    #[perm(check_view_perm)]
    #[route("/{iden}")]
    #[export("model", "statement", "user_recent_records", "user_last_accepted_record")]
    async fn post_view(
        store: &mut impl ModelStore,
        user_context: Option<UserAuthCotext>,
        pid: i64,
        stmtid: i64,
    ) -> ResultHandler<(ProblemModel, i64, Option<Vec<RecordEdge>>, Option<Vec<RecordEdge>>)> {
        let model = ProblemRepository::model(store, pid).await?;
        let get_user_submit_data = if let Some(uc) = &user_context
            && uc.is_real
        {
            let data =
                RecordRepository::by_user_statement(store.get_db(), uc.user_id, stmtid, 100, 1)
                    .await;
            data.ok()
        } else {
            None
        };
        let get_user_accepted_data = if let Some(uc) = &user_context
            && uc.is_real
        {
            Some(
                RecordRepository::by_node(
                    store.get_db(),
                    uc.user_id,
                    1,
                    1,
                    vec![
                        RecordEdgeColumn::RecordStatus
                            .eq(RecordStatus::Accepted.get_const_isize().unwrap_or(100) as i32),
                    ],
                )
                .await?,
            )
        } else {
            None
        };
        Ok((model, stmtid, get_user_submit_data, get_user_accepted_data))
    }
}
