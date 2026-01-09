use crate::handler::ResultHandler;
use crate::utils::perm::UserAuthCotext;
use enum_const::EnumConst;
use macro_handler::{export, from_path, generate_handler, handler, perm, require_login, route};
use rmjac_core::db::entity::node::problem_statement::ContentType;
use rmjac_core::graph::edge::perm_problem::ProblemPerm;
use rmjac_core::graph::edge::perm_system::SystemPerm;
use rmjac_core::graph::edge::problem_statement::ProblemStatementEdgeQuery;
use rmjac_core::graph::edge::EdgeQuery;
use rmjac_core::graph::node::problem::statement::ProblemStatementNode;
use rmjac_core::model::perm::{check_problem_perm, check_system_perm};
use rmjac_core::model::problem::{
    ProblemFactory, ProblemPermissionService, ProblemRepository, ProblemStatement,
    ProblemStatementProp,
};
use rmjac_core::model::ModelStore;

// Manage Handler - 管理题目（需要更复杂的权限检查）
#[generate_handler(route = "/manage", real_path = "/api/problem/manage")]
pub mod handler {
    use super::*;

    #[from_path(iden)]
    #[export(pid, stmtid)]
    async fn before_resolve(store: &mut impl ModelStore, iden: &str) -> ResultHandler<(i64, i64)> {
        Ok(ProblemRepository::resolve(store, iden).await?)
    }

    #[perm]
    #[require_login]
    async fn perm(user_context: UserAuthCotext, pid: i64) -> bool {
        let user_id = user_context.user_id;
        if check_problem_perm(
            user_id,
            pid,
            ProblemPerm::EditProblem.get_const_isize().unwrap() as i64,
        ) == 1
        {
            return true;
        }
        let system_id = rmjac_core::env::DEFAULT_NODES
            .lock()
            .unwrap()
            .default_system_node;
        check_system_perm(
            user_id,
            system_id,
            SystemPerm::ProblemManage.get_const_isize().unwrap() as i64,
        ) == 1
    }

    #[perm]
    #[require_login]
    async fn require_sudo(user_context: UserAuthCotext, pid: i64) -> bool {
        let user_id = user_context.user_id;
        if check_problem_perm(
            user_id,
            pid,
            ProblemPerm::OwnProblem.get_const_isize().unwrap() as i64,
        ) == 1
        {
            return true;
        }
        let system_id = rmjac_core::env::DEFAULT_NODES
            .lock()
            .unwrap()
            .default_system_node;
        check_system_perm(
            user_id,
            system_id,
            SystemPerm::ProblemManage.get_const_isize().unwrap() as i64,
        ) == 1
    }

    #[handler]
    #[perm(require_sudo)]
    #[route("/{iden}/delete")]
    #[export("message")]
    async fn post_delete(
        store: &mut impl ModelStore,
        pid: i64,
        stmtid: i64,
    ) -> ResultHandler<(String,)> {
        if stmtid != -1 {
            ProblemStatementEdgeQuery::delete(store.get_db(), pid, stmtid).await?;
        } else {
            ProblemRepository::purge(store, pid).await?;
        }
        Ok((format!("delete problem {}", pid),))
    }

    #[handler]
    #[perm(perm)]
    #[route("/{iden}/add_statement")]
    #[export("message", "result")]
    async fn post_add_statement(
        store: &mut impl ModelStore,
        pid: i64,
        body: ProblemStatementProp,
    ) -> ResultHandler<(String, ProblemStatementNode)> {
        let result = ProblemFactory::add_statement(
            store,
            pid,
            ProblemFactory::generate_statement_schema(body),
        )
        .await?;
        Ok(("success".to_string(), result))
    }

    #[handler]
    #[perm(perm)]
    #[route("/{iden}/update_statement_content")]
    #[export("message", "result")]
    async fn post_update_statement_content(
        store: &mut impl ModelStore,
        stmtid: i64,
        body: Vec<ContentType>,
    ) -> ResultHandler<(String, ProblemStatementNode)> {
        let stmt = ProblemStatement::new(stmtid);
        let result = stmt.set_content(store, body).await?;
        Ok(("success".to_string(), result))
    }

    #[handler]
    #[perm(perm)]
    #[route("/{iden}/update_statement_source")]
    #[export("message", "result")]
    async fn post_update_statement_source(
        store: &mut impl ModelStore,
        stmtid: i64,
        new_source: String,
    ) -> ResultHandler<(String, ProblemStatementNode)> {
        let stmt = ProblemStatement::new(stmtid);
        let result = stmt.set_source(store, &new_source).await?;
        Ok(("success".to_string(), result))
    }

    #[handler]
    #[perm(require_sudo)]
    #[route("/{iden}/add_iden")]
    #[export("message")]
    async fn post_add_iden(pid: i64, _new_iden: String) -> ResultHandler<(String,)> {
        // TODO: implement add_iden for problem {pid}
        let _ = pid;
        Ok(("work in progress.".to_string(),))
    }

    #[handler]
    #[perm(require_sudo)]
    #[route("/{iden}/perm/add_editor")]
    #[export("message")]
    async fn post_add_editor(
        store: &mut impl ModelStore,
        pid: i64,
        user_id: i64,
    ) -> ResultHandler<(String,)> {
        ProblemPermissionService::add_editor(store, user_id, pid).await?;
        Ok(("successful".to_string(),))
    }

    #[handler]
    #[perm(require_sudo)]
    #[route("/{iden}/perm/remove_editor")]
    #[export("message")]
    async fn post_remove_editor(
        store: &mut impl ModelStore,
        pid: i64,
        manager: i64,
    ) -> ResultHandler<(String,)> {
        ProblemPermissionService::remove_editor(store, manager, pid).await?;
        Ok(("successful".to_string(),))
    }

    #[handler]
    #[perm(perm)]
    #[route("/{iden}/perm/view_editor")]
    #[export("message")]
    async fn post_view_editor(pid: i64) -> ResultHandler<(String,)> {
        // TODO: implement view_editor for problem {pid}
        let _ = pid;
        Ok(("work in progress.".to_string(),))
    }

    #[handler]
    #[perm(perm)]
    #[route("/{iden}/perm/add_visitor")]
    #[export("message")]
    async fn post_add_visitor(
        store: &mut impl ModelStore,
        pid: i64,
        user_id: i64,
    ) -> ResultHandler<(String,)> {
        ProblemPermissionService::add_viewer(store, user_id, pid).await?;
        Ok(("successful".to_string(),))
    }

    #[handler]
    #[perm(perm)]
    #[route("/{iden}/perm/remove_visitor")]
    #[export("message")]
    async fn post_remove_visitor(
        store: &mut impl ModelStore,
        pid: i64,
        user_id: i64,
    ) -> ResultHandler<(String,)> {
        ProblemPermissionService::remove_viewer(store, user_id, pid).await?;
        Ok(("successful".to_string(),))
    }

    #[handler]
    #[perm(perm)]
    #[route("/{iden}/perm/view_visitor")]
    #[export("message")]
    async fn post_view_visitor(pid: i64) -> ResultHandler<(String,)> {
        // TODO: implement view_visitor for problem {pid}
        let _ = pid;
        Ok(("work in progress.".to_string(),))
    }

    #[handler]
    #[perm(require_sudo)]
    #[route("/{iden}/transfer_owner")]
    #[export("message")]
    async fn post_transfer_owner(
        store: &mut impl ModelStore,
        user_context: UserAuthCotext,
        pid: i64,
        new_owner: i64,
    ) -> ResultHandler<(String,)> {
        let old_owner_id = user_context.user_id;
        // Transfer ownership: remove old owner and add new owner
        ProblemPermissionService::remove_owner(store, old_owner_id, pid).await?;
        ProblemPermissionService::add_owner(store, new_owner, pid).await?;
        Ok(("successful".to_string(),))
    }
}
