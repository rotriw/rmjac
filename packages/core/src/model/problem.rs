use crate::db::entity::node::problem_statement::ContentType;
use crate::error::{CoreError, QueryExists};
use crate::graph::action::get_node_type;
use crate::graph::edge::perm_problem::{PermProblemEdgeQuery, ProblemPermRaw};
use crate::graph::edge::problem_limit::{ProblemLimitEdgeQuery, ProblemLimitEdgeRaw};
use crate::graph::edge::problem_statement::{ProblemStatementEdgeQuery, ProblemStatementEdgeRaw};
use crate::graph::edge::problem_tag::{ProblemTagEdgeQuery, ProblemTagEdgeRaw};
use crate::graph::edge::{EdgeQuery, EdgeRaw};
use crate::graph::edge::perm_problem::{PermProblemEdgeRaw, ProblemPerm};
use crate::graph::edge::perm_pages::{PermPagesEdgeRaw, PagesPerm};
use db::entity::edge::misc::Column as MiscColumn;
use crate::graph::node::problem::limit::{
    ProblemLimitNode, ProblemLimitNodePrivateRaw, ProblemLimitNodePublicRaw, ProblemLimitNodeRaw,
};
use crate::graph::node::problem::statement::{
    ProblemStatementNode, ProblemStatementNodePrivateRaw, ProblemStatementNodePublicRaw,
    ProblemStatementNodeRaw,
};
use crate::graph::node::problem::tag::{
    ProblemTagNode, ProblemTagNodePrivateRaw, ProblemTagNodePublicRaw, ProblemTagNodeRaw,
};
use crate::graph::node::problem::{
    ProblemNode, ProblemNodePrivateRaw, ProblemNodePublicRaw, ProblemNodeRaw,
};
use crate::graph::node::{Node, NodeRaw};
use crate::{Result, db};
use chrono::Utc;
use redis::Commands;
use sea_orm::{ColumnTrait, DatabaseConnection};
use serde::{Deserialize, Serialize};
use crate::graph::edge::misc::{MiscEdgeQuery, MiscEdgeRaw};
use crate::graph::edge::testcase::TestcaseEdgeRaw;
use crate::graph::node::record::subtask::{SubtaskCalcMethod, SubtaskNodePrivateRaw, SubtaskNodePublicRaw, SubtaskNodeRaw};
use crate::model::user::SimplyUser;
use crate::service::iden::{create_iden, get_node_id_iden, get_node_ids_from_iden, remove_iden_to_specific_node};

use crate::model::ModelStore;

type ProblemIdenString = String;

pub trait CacheKey {
    fn cache_key(node_id: i64) -> String;
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemStatementProp {
    pub statement_source: String,
    pub iden: String,
    pub problem_statements: Vec<ContentType>,
    pub time_limit: i64,
    pub memory_limit: i64,
    pub sample_group: Vec<(String, String)>,
    pub show_order: Vec<String>,
    pub page_source: Option<String>,
    pub page_rendered: Option<String>,
    pub problem_difficulty: Option<i32>,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct CreateProblemProps {
    pub user_id: i64,
    pub problem_iden: String,
    pub problem_name: String,
    pub problem_statement: Vec<ProblemStatementProp>,
    pub creation_time: Option<chrono::NaiveDateTime>,
    pub tags: Vec<String>,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemListQuery {
    pub page: Option<u64>,
    pub per_page: Option<u64>,
    pub name: Option<String>,
    pub tag: Option<Vec<String>>,
    pub author: Option<String>,
    pub difficulty: Option<i32>,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemModel {
    pub problem_node: ProblemNode,
    pub problem_statement_node: Vec<(ProblemStatementNode, ProblemLimitNode)>,
    pub tag: Vec<ProblemTagNode>,
    pub author: Option<SimplyUser>,
}

pub struct ProblemDraft<'a> {
    pub author_node_id: i64,
    pub iden_slug: &'a str,
    pub display_name: &'a str,
    pub statements: &'a [ProblemStatementProp],
    pub created_at: Option<chrono::NaiveDateTime>,
    pub tag_names: &'a [String],
    pub public_view_enabled: bool,
}

pub struct ProblemRepository;

impl CacheKey for ProblemRepository {
    fn cache_key(node_id: i64) -> String {
        format!("p_{node_id}")
    }
}

impl ProblemRepository {
    pub async fn iden(store: &mut impl ModelStore, id: i64) -> Result<String> {
        Self::extract_problem_iden(store, id).await
    }

    async fn extract_problem_iden(store: &mut impl ModelStore, problem_id: i64) -> Result<String> {
        let db = store.get_db().clone();
        let idens = get_node_id_iden(&db, store.get_redis(), problem_id).await?;
        Self::find_problem_iden(idens)
    }

    fn find_problem_iden(idens: Vec<String>) -> Result<String> {
        idens
            .into_iter()
            .find(|iden| iden.starts_with("problem"))
            .map(|iden| iden["problem".len()..].to_string())
            .ok_or_else(|| CoreError::NotFound("Cannot find problem iden".to_string()))
    }

    pub async fn resolve(store: &mut impl ModelStore, iden: &str) -> Result<(i64, i64)> {
        let db = store.get_db().clone();
        let ids = get_node_ids_from_iden(&db, store.get_redis(), &Self::iden_path(iden)).await?;
        Self::classify_ids(store, ids, iden).await
    }

    fn iden_path(iden: &str) -> String {
        format!("problem/{iden}")
    }

    async fn classify_ids(
        store: &mut impl ModelStore,
        candidate_ids: Vec<i64>,
        iden: &str,
    ) -> Result<(i64, i64)> {
        if candidate_ids.is_empty() {
            return Err(CoreError::NotFound("Cannot find problem".to_string()));
        }
        if candidate_ids.len() == 1 {
            return Ok((candidate_ids[0], candidate_ids[0]));
        }

        let (prob_id, stmt_id) = Self::find_node_types(store, candidate_ids).await?;
        Self::validate_ids(prob_id, stmt_id, iden)?;
        Ok((prob_id, stmt_id))
    }

    async fn find_node_types(store: &mut impl ModelStore, ids: Vec<i64>) -> Result<(i64, i64)> {
        let mut problem_id = -1;
        let mut statement_id = -1;

        for id in ids {
            let node_type = get_node_type(store.get_db(), id).await?;
            match node_type.as_str() {
                "problem" => problem_id = id,
                "problem_statement" => statement_id = id,
                _ => {}
            }
        }
        Ok((problem_id, statement_id))
    }

    fn validate_ids(problem_id: i64, statement_id: i64, iden: &str) -> Result<()> {
        if problem_id == -1 {
            return Err(CoreError::NotFound("Cannot find problem".to_string()));
        }
        if statement_id == -1 {
            log::warn!("{iden}: Multiple nodes found but no statement node");
        }
        Ok(())
    }

    pub async fn model(store: &mut impl ModelStore, id: i64) -> Result<ProblemModel> {
        if let Some(cached) = Self::get_cached(store, id).await {
            return Ok(cached);
        }
        let model = Self::load_full(store, id).await?;
        Self::cache(&model, store, id).await?;
        Ok(model)
    }

    async fn get_cached(store: &mut impl ModelStore, id: i64) -> Option<ProblemModel> {
        store
            .get_redis()
            .get::<_, String>(Self::cache_key(id))
            .ok()
            .and_then(|s| serde_json::from_str::<ProblemModel>(&s).ok())
    }

    async fn load_full(store: &mut impl ModelStore, id: i64) -> Result<ProblemModel> {
        let core = ProblemNode::from_db(store.get_db(), id).await?;
        let statements = Self::load_statements(store, id).await?;
        let tags = Self::load_tags(store, id).await?;
        let author = Self::load_author(store, id).await?;

        Ok(ProblemModel {
            problem_node: core,
            problem_statement_node: statements,
            tag: tags,
            author,
        })
    }

    async fn load_statements(
        store: &mut impl ModelStore,
        id: i64,
    ) -> Result<Vec<(ProblemStatementNode, ProblemLimitNode)>> {
        let stmt_ids = ProblemStatementEdgeQuery::get_v(id, store.get_db()).await?;
        let mut stmts = Vec::with_capacity(stmt_ids.len());

        for stmt_id in stmt_ids {
            let stmt = ProblemStatementNode::from_db(store.get_db(), stmt_id).await?;
            if let Some(limit) = Self::load_limit(store, stmt_id).await? {
                stmts.push((stmt, limit));
            }
        }
        Ok(stmts)
    }

    async fn load_limit(
        store: &mut impl ModelStore,
        stmt_id: i64,
    ) -> Result<Option<ProblemLimitNode>> {
        let limit_ids = ProblemLimitEdgeQuery::get_v(stmt_id, store.get_db()).await?;
        match limit_ids.first() {
            Some(&id) => Ok(Some(ProblemLimitNode::from_db(store.get_db(), id).await?)),
            None => Ok(None),
        }
    }

    async fn load_tags(store: &mut impl ModelStore, id: i64) -> Result<Vec<ProblemTagNode>> {
        let tag_ids = ProblemTagEdgeQuery::get_v(id, store.get_db()).await?;
        let mut tags = Vec::with_capacity(tag_ids.len());
        for tag_id in tag_ids {
            tags.push(ProblemTagNode::from_db(store.get_db(), tag_id).await?);
        }
        Ok(tags)
    }

    async fn load_author(store: &mut impl ModelStore, id: i64) -> Result<Option<SimplyUser>> {
        let author_ids =
            MiscEdgeQuery::get_u_filter(id, MiscColumn::MiscType.eq("author"), store.get_db()).await?;
        match author_ids.first() {
            Some(&author_id) => {
                let user = crate::model::user::SimplyUser::load(store.get_db(), author_id)
                    .await
                    .unwrap_or(SimplyUser {
                        node_id: author_id,
                        name: "unknown".to_string(),
                        iden: "unknown".to_string(),
                        avatar: "default".to_string(),
                    });
                Ok(Some(user))
            }
            None => Ok(None),
        }
    }

    async fn cache(model: &ProblemModel, store: &mut impl ModelStore, id: i64) -> Result<()> {
        let key = Self::cache_key(id);
        let serialized = serde_json::to_string(model)?;
        store.get_redis().set::<_, _, ()>(&key, serialized)?;
        store.get_redis().expire::<_, ()>(&key, 3600)?;
        Ok(())
    }

    pub async fn clear(store: &mut impl ModelStore, id: i64) -> Result<()> {
        store.get_redis().del::<_, ()>(Self::cache_key(id))?;
        Ok(())
    }

    pub async fn purge(store: &mut impl ModelStore, id: i64) -> Result<()> {
        Self::detach_all_statements(store, id).await?;
        Self::detach_all_tags(store, id).await?;
        Self::clear(store, id).await
    }

    async fn detach_all_statements(store: &mut impl ModelStore, id: i64) -> Result<()> {
        let stmt_ids = ProblemStatementEdgeQuery::get_v(id, store.get_db()).await?;
        for stmt_id in stmt_ids {
            Self::detach_statement(store, id, stmt_id).await?;
        }
        Ok(())
    }

    async fn detach_all_tags(store: &mut impl ModelStore, id: i64) -> Result<()> {
        let tag_ids = ProblemTagEdgeQuery::get_v(id, store.get_db()).await?;
        for tag_id in tag_ids {
            ProblemTagEdgeQuery::delete(store.get_db(), id, tag_id).await?;
        }
        Ok(())
    }
    pub async fn detach_statement(
        store: &mut impl ModelStore,
        problem_id: i64,
        stmt_id: i64,
    ) -> Result<()> {
        let db = store.get_db().clone();
        {
            let redis = store.get_redis();
            Self::detach_limits(&db, redis, stmt_id).await?;
        }
        {
            let redis = store.get_redis();
            Self::remove_idens(&db, redis, stmt_id).await?;
        }
        ProblemStatementEdgeQuery::delete(&db, problem_id, stmt_id).await?;
        Self::clear(store, problem_id).await
    }

    async fn detach_limits(
        db: &DatabaseConnection,
        _redis: &mut redis::Connection,
        stmt_id: i64,
    ) -> Result<()> {
        let limit_ids = ProblemLimitEdgeQuery::get_v(stmt_id, db).await?;
        for limit_id in limit_ids {
            ProblemLimitEdgeQuery::delete(db, stmt_id, limit_id).await?;
        }
        Ok(())
    }

    async fn remove_idens(
        db: &DatabaseConnection,
        redis: &mut redis::Connection,
        node_id: i64,
    ) -> Result<()> {
        let idens = get_node_id_iden(db, redis, node_id).await?;
        for iden in idens {
            remove_iden_to_specific_node(db, &iden, node_id).await?;
        }
        Ok(())
    }

    pub async fn detach_tag(
        store: &mut impl ModelStore,
        problem_id: i64,
        tag_id: i64,
    ) -> Result<()> {
        ProblemTagEdgeQuery::delete(store.get_db(), problem_id, tag_id).await?;
        Self::clear(store, problem_id).await
    }
}

impl<'a> ProblemDraft<'a> {
    pub async fn commit(
        &self,
        store: &mut impl ModelStore,
    ) -> Result<ProblemNode> {
        let db = store.get_db().clone();
        if get_node_ids_from_iden(&db, store.get_redis(), format!("problem/{}", self.iden_slug).as_str()).await.is_ok() {
            return Err(CoreError::QueryExists(QueryExists::ProblemExist));
        }

        let statement_blueprints: Vec<_> = self
            .statements
            .iter()
            .cloned()
            .map(ProblemFactory::generate_statement_schema)
            .collect();

        let mut tag_node_ids = Vec::with_capacity(self.tag_names.len());
        for tag_name in self.tag_names {
            use db::entity::node::problem_tag::Column as ProblemTagColumn;
            let existing = ProblemTagNode::from_db_filter(store.get_db(), ProblemTagColumn::TagName.eq(tag_name)).await?;
            let tag_id = if existing.is_empty() {
                ProblemTagNodeRaw {
                    public: ProblemTagNodePublicRaw {
                        tag_name: tag_name.clone(),
                        tag_description: String::new(),
                    },
                    private: ProblemTagNodePrivateRaw {},
                }
                .save(store.get_db())
                .await?
                .node_id
            } else {
                existing[0].node_id
            };
            tag_node_ids.push(tag_id);
        }

        let problem_node = ProblemFactory::create_schema(
            store,
            statement_blueprints,
            tag_node_ids,
            self.display_name,
            self.created_at.unwrap_or(Utc::now().naive_utc()),
        )
        .await?;

        let redis = store.get_redis();
        create_iden(&db, redis, &format!("problem/{}", self.iden_slug), vec![problem_node.node_id]).await?;

        ProblemPermissionService::grant_creator(store, self.author_node_id, problem_node.node_id).await?;

        MiscEdgeRaw {
            u: self.author_node_id,
            v: problem_node.node_id,
            misc_type: "author".to_string(),
        }
        .save(store.get_db())
        .await?;

        if self.public_view_enabled {
            let guest_node = crate::env::DEFAULT_NODES.lock().unwrap().guest_user_node;
            PermProblemEdgeRaw {
                u: guest_node,
                v: problem_node.node_id,
                perms: ProblemPermRaw::Perms(vec![ProblemPerm::ReadProblem]),
            }
            .save(store.get_db())
            .await?;
        }

        Ok(problem_node)
    }
}

pub struct Problem {
    pub node_id: i64,
}

impl Problem {
    pub fn new(node_id: i64) -> Self {
        Self { node_id }
    }

    pub async fn load(store: &impl ModelStore, node_id: i64) -> Result<ProblemNode> {
        ProblemNode::from_db(store.get_db(), node_id).await
    }

    pub async fn get(
        &self,
        store: &mut impl ModelStore,
    ) -> Result<ProblemModel> {
        ProblemRepository::model(store, self.node_id).await
    }

    pub async fn refresh(&self, store: &mut impl ModelStore) -> Result<()> {
        ProblemRepository::clear(store, self.node_id).await
    }

    pub async fn rm_all(
        &self,
        store: &mut impl ModelStore,
    ) -> Result<()> {
        ProblemRepository::purge(store, self.node_id).await
    }

    pub async fn rm_stmt(
        &self,
        store: &mut impl ModelStore,
        stmt_id: i64,
    ) -> Result<()> {
        ProblemRepository::detach_statement(store, self.node_id, stmt_id).await
    }

    pub async fn rm_tag(
        &self,
        store: &mut impl ModelStore,
        tag_id: i64,
    ) -> Result<()> {
        ProblemRepository::detach_tag(store, self.node_id, tag_id).await
    }

    pub async fn set_creator(&self, store: &impl ModelStore, user_id: i64) -> Result<()> {
        ProblemPermissionService::grant_creator(store, user_id, self.node_id).await
    }

    pub async fn set_author(&self, store: &impl ModelStore, user_id: i64) -> Result<()> {
        MiscEdgeRaw {
            u: user_id,
            v: self.node_id,
            misc_type: "author".to_string(),
        }
        .save(store.get_db())
        .await?;
        Ok(())
    }
}

pub struct ProblemStatement {
    pub node_id: i64,
}

impl ProblemStatement {
    pub fn new(node_id: i64) -> Self {
        Self { node_id }
    }

    pub async fn load(store: &impl ModelStore, node_id: i64) -> Result<ProblemStatementNode> {
        ProblemStatementNode::from_db(store.get_db(), node_id).await
    }

    pub async fn iden(&self, store: &mut impl ModelStore) -> Result<String> {
        Self::extract_iden(store, self.node_id).await
    }

    async fn extract_iden(store: &mut impl ModelStore, id: i64) -> Result<String> {
        let db = store.get_db().clone();
        let iden_list = get_node_id_iden(&db, store.get_redis(), id).await?;
        Self::find_iden(iden_list)
    }

    fn find_iden(idens: Vec<String>) -> Result<String> {
        for iden in idens {
            if let Some(stripped) = iden.strip_prefix("problem") {
                return Ok(stripped.to_string());
            }
        }
        Err(CoreError::NotFound("Cannot find problem iden".to_string()))
    }

    pub async fn set_content(
        &self,
        store: &mut impl ModelStore,
        content: Vec<ContentType>,
    ) -> Result<ProblemStatementNode> {
        use db::entity::node::problem_statement::Column::Content;
        let node = ProblemStatementNode::from_db(store.get_db(), self.node_id).await?;
        let result = node.modify(store.get_db(), Content, content).await?;
        self.flush_parent(store).await?;
        Ok(result)
    }

    pub async fn set_source(
        &self,
        store: &mut impl ModelStore,
        source: &str,
    ) -> Result<ProblemStatementNode> {
        use db::entity::node::problem_statement::Column::Source;
        let node = ProblemStatementNode::from_db(store.get_db(), self.node_id).await?;
        let result = node.modify(store.get_db(), Source, source).await?;
        self.flush_parent(store).await?;
        Ok(result)
    }

    async fn flush_parent(&self, store: &mut impl ModelStore) -> Result<()> {
        if let Ok(parent_id) = ProblemStatementEdgeQuery::get_u_one(self.node_id, store.get_db()).await {
            let key = ProblemRepository::cache_key(parent_id);
            let _ = store.get_redis().del::<_, ()>(&key);
        }
        Ok(())
    }
}

pub struct ProblemPermissionService;

#[derive(Clone, Debug)]
pub enum Role {
    Owner,
    Editor,
    Viewer,
}

impl Role {
    fn perms(&self) -> Vec<ProblemPerm> {
        match self {
            Role::Owner => vec![ProblemPerm::OwnProblem],
            Role::Editor => vec![ProblemPerm::EditProblem],
            Role::Viewer => vec![ProblemPerm::ReadProblem],
        }
    }
}

impl ProblemPermissionService {
    pub async fn grant_creator(
        store: &impl ModelStore,
        user_id: i64,
        problem_id: i64,
    ) -> Result<()> {
        PermProblemEdgeRaw {
            u: user_id,
            v: problem_id,
            perms: ProblemPermRaw::Perms(vec![
                ProblemPerm::ReadProblem,
                ProblemPerm::EditProblem,
                ProblemPerm::DeleteProblem,
                ProblemPerm::OwnProblem,
            ]),
        }
        .save(store.get_db())
        .await?;

        PermPagesEdgeRaw {
            u: user_id,
            v: problem_id,
            perms: crate::graph::edge::perm_pages::PagesPermRaw::Perms(vec![
                PagesPerm::ReadPages,
                PagesPerm::EditPages,
                PagesPerm::PublishPages,
            ]),
        }
        .save(store.get_db())
        .await?;
        Ok(())
    }

    pub async fn grant_access(
        store: &impl ModelStore,
        user_id: i64,
        problem_id: i64,
        can_edit: bool,
    ) -> Result<()> {
        let mut perms = vec![ProblemPerm::ReadProblem];
        if can_edit {
            perms.push(ProblemPerm::EditProblem);
        }
        PermProblemEdgeRaw {
            u: user_id,
            v: problem_id,
            perms: ProblemPermRaw::Perms(perms),
        }
        .save(store.get_db())
        .await?;
        Ok(())
    }

    /// Generic function to grant permission by role (Owner/Editor/Viewer)
    pub async fn grant_role(
        store: &impl ModelStore,
        user_id: i64,
        problem_id: i64,
        role: Role,
    ) -> Result<()> {
        PermProblemEdgeRaw {
            u: user_id,
            v: problem_id,
            perms: ProblemPermRaw::Perms(role.perms()),
        }
        .save(store.get_db())
        .await?;
        Ok(())
    }

    /// Generic function to revoke permission (for any role)
    pub async fn revoke_permission(
        store: &impl ModelStore,
        user_id: i64,
        problem_id: i64,
    ) -> Result<()> {
        PermProblemEdgeQuery::delete(store.get_db(), user_id, problem_id).await?;
        Ok(())
    }

    // Convenience methods for backward compatibility
    pub async fn add_owner(
        store: &impl ModelStore,
        user_id: i64,
        problem_id: i64,
    ) -> Result<()> {
        Self::grant_role(store, user_id, problem_id, Role::Owner).await
    }

    pub async fn remove_owner(
        store: &impl ModelStore,
        user_id: i64,
        problem_id: i64,
    ) -> Result<()> {
        Self::revoke_permission(store, user_id, problem_id).await
    }

    pub async fn add_editor(
        store: &impl ModelStore,
        user_id: i64,
        problem_id: i64,
    ) -> Result<()> {
        Self::grant_role(store, user_id, problem_id, Role::Editor).await
    }

    pub async fn remove_editor(
        store: &impl ModelStore,
        user_id: i64,
        problem_id: i64,
    ) -> Result<()> {
        Self::revoke_permission(store, user_id, problem_id).await
    }

    pub async fn add_viewer(
        store: &impl ModelStore,
        user_id: i64,
        problem_id: i64,
    ) -> Result<()> {
        Self::grant_role(store, user_id, problem_id, Role::Viewer).await
    }

    pub async fn remove_viewer(
        store: &impl ModelStore,
        user_id: i64,
        problem_id: i64,
    ) -> Result<()> {
        Self::revoke_permission(store, user_id, problem_id).await
    }
}

// Backward compat alias
pub use ProblemPermissionService as Perm;

pub struct ProblemFactory;

impl ProblemFactory {
    // Generate statement schema without DB access
    pub fn generate_statement_schema(
        statement: ProblemStatementProp,
    ) -> (ProblemStatementNodeRaw, ProblemLimitNodeRaw, Option<ProblemIdenString>) {
        (
            ProblemStatementNodeRaw {
                public: ProblemStatementNodePublicRaw {
                    statements: statement.problem_statements.clone(),
                    source: statement.statement_source.clone(),
                    creation_time: Utc::now().naive_utc(),
                    iden: statement.iden.clone(),
                    sample_group_in: statement.sample_group.iter().map(|(a, _)| a.clone()).collect(),
                    sample_group_out: statement.sample_group.iter().map(|(_, b)| b.clone()).collect(),
                    show_order: statement.show_order.clone(),
                    page_source: statement.page_source.clone(),
                    page_rendered: statement.page_rendered.clone(),
                    problem_difficulty: statement.problem_difficulty,
                },
                private: ProblemStatementNodePrivateRaw {},
            },
            ProblemLimitNodeRaw {
                public: ProblemLimitNodePublicRaw {
                    time_limit: statement.time_limit,
                    memory_limit: statement.memory_limit,
                },
                private: ProblemLimitNodePrivateRaw {},
            },
            Some(statement.iden),
        )
    }

    pub async fn create_schema(
        store: &mut impl ModelStore,
        problem_statement: Vec<(
            ProblemStatementNodeRaw,
            ProblemLimitNodeRaw,
            Option<ProblemIdenString>,
        )>,
        tag_node_id: Vec<i64>,
        problem_name: &str,
        created_at: chrono::NaiveDateTime,
    ) -> Result<ProblemNode> {
        let problem_node = ProblemNodeRaw {
            public: ProblemNodePublicRaw {
                name: problem_name.to_string(),
                creation_time: created_at,
            },
            private: ProblemNodePrivateRaw {},
        }
        .save(store.get_db())
        .await?;

        for data in problem_statement {
            Self::add_statement(store, problem_node.node_id, data).await?;
        }
        for tag_node in tag_node_id {
            ProblemTagEdgeRaw {
                u: problem_node.node_id,
                v: tag_node,
            }
            .save(store.get_db())
            .await?;
        }
        Ok(problem_node)
    }

    pub async fn add_statement(
        store: &mut impl ModelStore,
        problem_node_id: i64,
        problem_statement: (
            ProblemStatementNodeRaw,
            ProblemLimitNodeRaw,
            Option<ProblemIdenString>,
        ),
    ) -> Result<ProblemStatementNode> {
        let (problem_statement_node_raw, problem_limit_node_raw, iden) = problem_statement;
        let db = store.get_db().clone();
        let problem_statement_node = problem_statement_node_raw.save(&db).await?;
        let problem_limit_node = problem_limit_node_raw.save(&db).await?;

        ProblemStatementEdgeRaw {
            u: problem_node_id,
            v: problem_statement_node.node_id,
            copyright_risk: 0,
        }
        .save(&db)
        .await?;

        if let Some(iden) = iden {
            let redis = store.get_redis();
            create_iden(&db, redis, &format!("problem/{}", iden), vec![problem_statement_node.node_id, problem_node_id])
                .await?;
        }

        ProblemLimitEdgeRaw {
            u: problem_statement_node.node_id,
            v: problem_limit_node.node_id,
        }
        .save(&db)
        .await?;

        let subtask_node = SubtaskNodeRaw {
            public: SubtaskNodePublicRaw {
                subtask_id: 0,
                time_limit: problem_limit_node.public.time_limit,
                memory_limit: problem_limit_node.public.memory_limit,
                subtask_calc_method: SubtaskCalcMethod::Sum,
                is_root: true,
            },
            private: SubtaskNodePrivateRaw {
                subtask_calc_function: None,
            },
        }
        .save(store.get_db())
        .await?;

        TestcaseEdgeRaw {
            u: problem_statement_node.node_id,
            v: subtask_node.node_id,
            order: 0,
        }
        .save(store.get_db())
        .await?;

        Ok(problem_statement_node)
    }

    pub async fn create_with_user(
        store: &mut impl ModelStore,
        problem: &CreateProblemProps,
        public_view: bool,
    ) -> Result<ProblemNode> {
        ProblemDraft {
            author_node_id: problem.user_id,
            iden_slug: &problem.problem_iden,
            display_name: &problem.problem_name,
            statements: &problem.problem_statement,
            created_at: problem.creation_time,
            tag_names: &problem.tags,
            public_view_enabled: public_view,
        }
        .commit(store)
        .await
    }
}


