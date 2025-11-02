use crate::db::entity::node::problem_statement::ContentType;
use crate::error::CoreError;
use crate::graph::action::get_node_type;
use crate::graph::edge::problem_limit::{ProblemLimitEdgeQuery, ProblemLimitEdgeRaw};
use crate::graph::edge::problem_statement::{ProblemStatementEdgeQuery, ProblemStatementEdgeRaw};
use crate::graph::edge::problem_tag::{ProblemTagEdgeQuery, ProblemTagEdgeRaw};
use crate::graph::edge::{EdgeQuery, EdgeRaw};
use crate::graph::edge::perm_problem::{PermProblemEdgeRaw, ProblemPerm};
use crate::graph::edge::perm_pages::{PermPagesEdgeRaw, PagesPerm};
use enum_const::EnumConst;
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
use crate::service::iden::{create_iden, get_node_ids_from_iden};

type ProblemIdenString = String;

pub async fn create_problem_schema(
    db: &DatabaseConnection,
    problem_statement: Vec<(
        ProblemStatementNodeRaw,
        ProblemLimitNodeRaw,
        Option<ProblemIdenString>,
    )>,
    tag_node_id: Vec<i64>,
    problem_name: String,
) -> Result<ProblemNode> {
    log::info!("Start to create problem schema");
    let problem_node = ProblemNodeRaw {
        public: ProblemNodePublicRaw {
            name: problem_name,
            creation_time: Utc::now().naive_utc(),
        },
        private: ProblemNodePrivateRaw {},
    }
    .save(db)
    .await?;
    let problem_node_id = problem_node.node_id;
    for data in problem_statement {
        add_problem_statement_for_problem(db, problem_node_id, data).await?;
    }
    for tag_node in tag_node_id {
        ProblemTagEdgeRaw {
            u: problem_node.node_id,
            v: tag_node,
        }
        .save(db)
        .await?;
    }
    log::info!(
        "Problem schema have been created. problem_node_id: {}",
        problem_node.node_id
    );
    Ok(problem_node)
}

pub async fn add_problem_statement_for_problem(
    db: &DatabaseConnection,
    problem_node_id: i64,
    problem_statement: (
        ProblemStatementNodeRaw,
        ProblemLimitNodeRaw,
        Option<ProblemIdenString>,
    ),
) -> Result<()> {
    log::debug!("Creating problem statement node and limit node");
    let (
        problem_statement_node_raw,
        problem_limit_node_raw,
        iden
    ) = problem_statement;
    let problem_statement_node = problem_statement_node_raw.save(db).await?;
    let problem_limit_node = problem_limit_node_raw.save(db).await?;
    // problem -statement-> statement
    log::debug!("Creating problem statement edge");
    ProblemStatementEdgeRaw {
        u: problem_node_id,
        v: problem_statement_node.node_id,
        copyright_risk: 0, // default
    }
        .save(db)
        .await?;
    if let Some(iden) = iden {
        create_iden(format!("problem/{}", iden).as_str(), vec![problem_statement_node.node_id, problem_node_id], db).await?;
    }
    // 暂时允许访问题目 = 访问所有题面
    // statement -limit-> limit
    log::debug!("Add problem limit edge");
    ProblemLimitEdgeRaw {
        u: problem_statement_node.node_id,
        v: problem_limit_node.node_id,
    }
    .save(db)
    .await?;
    Ok(())
}

pub async fn delete_problem_statement_for_problem(
    db: &DatabaseConnection,
    problem_node_id: i64,
    problem_statement_node_id: i64,
) -> Result<()> {
    log::debug!("Deleting problem statement node and limit node");
    ProblemStatementEdgeQuery::delete(db, problem_node_id, problem_statement_node_id).await?;
    log::debug!("Problem statement edge have been deleted");
    Ok(())
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemStatementProp {
    pub statement_source: String,       // used to statement description
    pub problem_iden: Option<String>,   // used to create problem_iden node
    pub problem_statements: Vec<ContentType>,
    pub time_limit: i64,
    pub memory_limit: i64,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct CreateProblemProps {
    pub problem_iden: String,
    pub problem_name: String,
    pub problem_statement: Vec<ProblemStatementProp>,
    pub creation_time: Option<chrono::NaiveDateTime>,
    pub tags: Vec<String>,
}

pub async fn create_problem(
    db: &DatabaseConnection,
    problem: CreateProblemProps,
) -> Result<ProblemNode> {
    log::info!("Creating new problem, name:{}.", &problem.problem_name);
    let problem_node_raw = ProblemNodeRaw {
        public: ProblemNodePublicRaw {
            name: problem.problem_name.clone(),
            creation_time: problem.creation_time.unwrap_or(Utc::now().naive_utc()),
        },
        private: ProblemNodePrivateRaw {},
    };
    log::info!("Problem Node Raw: {problem_node_raw:?}");
    let mut problem_statement_node_raw = vec![];
    for statement in problem.problem_statement {
        problem_statement_node_raw.push((
            ProblemStatementNodeRaw {
                public: ProblemStatementNodePublicRaw {
                    statements: statement.problem_statements,
                    source: statement.statement_source,
                    creation_time: problem.creation_time.unwrap_or(Utc::now().naive_utc()),
                    iden: problem.problem_iden.clone(),
                },
                private: ProblemStatementNodePrivateRaw {},
            }
            .clone(),
            ProblemLimitNodeRaw {
                public: ProblemLimitNodePublicRaw {
                    time_limit: statement.time_limit,
                    memory_limit: statement.memory_limit,
                },
                private: ProblemLimitNodePrivateRaw {},
            }
            .clone(),
            statement.problem_iden,
        ));
    }
    log::info!("Problem Statements Raw: {problem_statement_node_raw:?}");
    let mut tag_ids = vec![];
    for i in problem.tags {
        use db::entity::node::problem_tag::Column as ProblemTagColumn;
        log::trace!("Finding tag {i} in database");
        let id = ProblemTagNode::from_db_filter(db, ProblemTagColumn::TagName.eq(&i)).await?;
        tag_ids.push(if id.is_empty() {
            log::debug!("Cannot find tag {i}, creating new.");
            ProblemTagNodeRaw {
                public: ProblemTagNodePublicRaw {
                    tag_name: i,
                    tag_description: "".to_string(),
                },
                private: ProblemTagNodePrivateRaw {},
            }
            .save(db)
            .await?
            .node_id
        } else {
            id[0].node_id
        });
    }
    log::info!("Final Problem Tags ids: {problem_statement_node_raw:?}");
    log::info!("Data collected");
    let result = create_problem_schema(
        db,
        problem_statement_node_raw,
        tag_ids,
        problem.problem_name.clone(),
    )
    .await?;
    log::info!("Start to create problem_source for problem");
    create_iden(
        format!("problem/{}", problem.problem_iden).as_str(),
        vec![result.node_id],
        db,
    ).await?;

    // 注释掉权限授予，因为基础创建函数不需要认证
    // log::info!("Granting permissions to problem creator");
    // if let Some(creator_node_id) = get_current_user_node_id(db).await? {
    //     grant_problem_creator_permissions(db, creator_node_id, result.node_id).await?;
    // }

    log::info!("The problem {} have been created.", &problem.problem_name);
    Ok(result)
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemModel {
    pub problem_node: ProblemNode,
    pub problem_statement_node: Vec<(ProblemStatementNode, ProblemLimitNode)>,
    pub tag: Vec<ProblemTagNode>,
}

/// Get problem data by identifier
pub async fn get_problem(
    db: &DatabaseConnection,
    redis: &mut redis::Connection,
    iden: &str,
) -> Result<(ProblemModel, i64)> {
    let node_ids = get_node_ids_from_iden(format!("problem/{iden}").as_str(), db, redis).await?;
    if node_ids.is_empty() {
        return Err(CoreError::NotFound("Cannot find problem with this iden".to_string()));
    }
    let (problem_node, statement_node) = if node_ids.len() == 1 {
        (node_ids[0], node_ids[0])
    } else {
        let mut problem_node = -1;
        let mut statement_node = -1;
        for node_id in node_ids {
            let node_type = get_node_type(db, node_id).await?;
            if node_type == "problem" {
                problem_node = node_id;
            } else if node_type == "problem_statement" {
                statement_node = node_id;
            }
        }
        if problem_node == -1 {
            return Err(CoreError::NotFound("Cannot find problem with this iden".to_string()));
        }
        if statement_node == -1 {
            log::warn!("{iden} There are many node for this iden, We can find a problem node, and there are many other iden, but we cannot find a statement node!");
        }
        (problem_node, statement_node)
    };
    Ok((get_problem_model(db, redis, problem_node).await?, statement_node))
}

/**
* 题目数据
*/
pub async fn get_problem_model(
    db: &DatabaseConnection,
    redis: &mut redis::Connection,
    problem_node_id: i64,
) -> Result<ProblemModel> {
    if let Ok(value) = redis.get::<_, String>(format!("p_{problem_node_id}"))
        && let Ok(problem_model) = serde_json::from_str::<ProblemModel>(value.as_str()) {
            return Ok(problem_model);
        }
    let problem_node = ProblemNode::from_db(db, problem_node_id).await?;

    // 使用库函数获取题目相关的statement节点
    let problem_statement_node_id = ProblemStatementEdgeQuery::get_v(problem_node.node_id, db).await?;
    let mut problem_statement_node = vec![];
    for node_id in problem_statement_node_id {
        let statement_node = ProblemStatementNode::from_db(db, node_id).await?;
        let limit_node_ids = ProblemLimitEdgeQuery::get_v(node_id, db).await?;
        if let Some(&limit_node_id) = limit_node_ids.first() {
            let problem_limit_node = ProblemLimitNode::from_db(db, limit_node_id).await?;
            problem_statement_node.push((statement_node, problem_limit_node));
        }
    }

    // 使用库函数获取题目相关的tag节点
    let tag_node_ids = ProblemTagEdgeQuery::get_v(problem_node.node_id, db).await?;
    let mut tag = vec![];
    for tag_node_id in tag_node_ids {
        let tag_node = ProblemTagNode::from_db(db, tag_node_id).await?;
        tag.push(tag_node);
    }
    let problem_model = ProblemModel {
        problem_node,
        problem_statement_node,
        tag,
    };
    let serialized = serde_json::to_string(&problem_model)?;
    redis.set::<_, _, ()>(format!("p_{problem_node_id}"), serialized)?;
    redis.expire::<_, ()>(format!("p_{problem_node_id}"), 3600)?;
    Ok(problem_model)
}

pub async fn refresh_problem_node_cache(redis: &mut redis::Connection, node_id: i64) -> Result<()> {
    redis.del::<_, ()>(format!("p_{node_id}"))?;
    Ok(())
}
pub async fn modify_problem_statement(
    db: &DatabaseConnection,
    redis: &mut redis::Connection,
    node_id: i64,
    new_content: Vec<ContentType>,
) -> Result<ProblemStatementNode> {
    use db::entity::node::problem_statement::Column::Content;
    let result = ProblemStatementNode::from_db(db, node_id)
        .await?
        .modify(db, Content, new_content)
        .await?;
    let problem_node_id = ProblemStatementEdgeQuery::get_u_one(node_id, db).await;
    if let Ok(problem_node_id) = problem_node_id {
        refresh_problem_node_cache(redis, problem_node_id).await?;
    }
    Ok(result)
}

pub async fn modify_problem_statement_source(
    db: &DatabaseConnection,
    redis: &mut redis::Connection,
    node_id: i64,
    new_source: String,
) -> Result<ProblemStatementNode> {
    use db::entity::node::problem_statement::Column::Source;
    let result = ProblemStatementNode::from_db(db, node_id)
        .await?
        .modify(db, Source, new_source)
        .await?;
    let problem_node_id = ProblemStatementEdgeQuery::get_u_one(node_id, db).await;
    if let Ok(problem_node_id) = problem_node_id {
        refresh_problem_node_cache(redis, problem_node_id).await?;
    }
    Ok(result)
}

/// Delete all connections for a problem (edges only)
/// This function removes all edges connected to a problem while keeping the nodes intact
pub async fn delete_problem_connections(
    db: &DatabaseConnection,
    redis: &mut redis::Connection,
    problem_iden: &str,
) -> Result<()> {
    log::info!("Starting to delete connections for problem: {}", problem_iden);

    // Get problem node ID from iden
    let node_ids = get_node_ids_from_iden(problem_iden, db, redis).await?;
    if node_ids.is_empty() {
        return Err(CoreError::NotFound("Cannot find problem with this iden".to_string()));
    }

    // Find the problem node ID (not statement node)
    let mut problem_node_id = -1;
    for &node_id in &node_ids {
        if let Ok(node_type) = get_node_type(db, node_id).await
            && node_type == "problem" {
                problem_node_id = node_id;
                break;
            }
    }

    // If no problem nofde found, use the first node ID
    if problem_node_id == -1 {
        problem_node_id = node_ids[0];
    }

    log::debug!("Found problem node ID: {}", problem_node_id);

    // Get all statement nodes connected to this problem using EdgeQuery
    let statement_node_ids = ProblemStatementEdgeQuery::get_v(problem_node_id, db).await?;
    log::debug!("Found {} statement nodes", statement_node_ids.len());

    // For each statement node, delete its limit edges and then the statement edge
    for statement_node_id in statement_node_ids {
        // Delete problem-limit edges using EdgeQuery
        let limit_node_ids = ProblemLimitEdgeQuery::get_v(statement_node_id, db).await?;
        for limit_node_id in limit_node_ids {
            ProblemLimitEdgeQuery::delete(db, statement_node_id, limit_node_id).await?;
            log::debug!("Deleted problem-limit edge: {} -> {}", statement_node_id, limit_node_id);
        }

        // Delete problem-statement edge using EdgeQuery
        ProblemStatementEdgeQuery::delete(db, problem_node_id, statement_node_id).await?;
        log::debug!("Deleted problem-statement edge: {} -> {}", problem_node_id, statement_node_id);
    }

    // Delete all problem-tag edges using EdgeQuery
    let tag_node_ids = ProblemTagEdgeQuery::get_v(problem_node_id, db).await?;
    for tag_node_id in tag_node_ids {
        ProblemTagEdgeQuery::delete(db, problem_node_id, tag_node_id).await?;
        log::debug!("Deleted problem-tag edge: {} -> {}", problem_node_id, tag_node_id);
    }

    // Clear cache
    refresh_problem_node_cache(redis, problem_node_id).await?;

    log::info!("Successfully deleted all connections for problem: {}", problem_iden);
    Ok(())
}

/// Remove a specific statement from a problem (delete edges only)
pub async fn remove_statement_from_problem(
    db: &DatabaseConnection,
    redis: &mut redis::Connection,
    problem_node_id: i64,
    statement_node_id: i64,
) -> Result<()> {
    log::info!("Removing statement {} from problem {}", statement_node_id, problem_node_id);

    // Delete problem-limit edges using EdgeQuery
    let limit_node_ids = ProblemLimitEdgeQuery::get_v(statement_node_id, db).await?;
    for limit_node_id in limit_node_ids {
        ProblemLimitEdgeQuery::delete(db, statement_node_id, limit_node_id).await?;
        log::debug!("Deleted problem-limit edge: {} -> {}", statement_node_id, limit_node_id);
    }

    // Delete problem-statement edge using EdgeQuery
    ProblemStatementEdgeQuery::delete(db, problem_node_id, statement_node_id).await?;

    // Refresh problem cache
    refresh_problem_node_cache(redis, problem_node_id).await?;

    log::info!("Successfully removed statement {} from problem {}", statement_node_id, problem_node_id);
    Ok(())
}

/// Remove a tag from a problem (delete edge only)
pub async fn remove_tag_from_problem(
    db: &DatabaseConnection,
    redis: &mut redis::Connection,
    problem_node_id: i64,
    tag_node_id: i64,
) -> Result<()> {
    log::info!("Removing tag {} from problem {}", tag_node_id, problem_node_id);

    // Delete the problem-tag edge using EdgeQuery
    ProblemTagEdgeQuery::delete(db, problem_node_id, tag_node_id).await?;

    // Refresh problem cache
    refresh_problem_node_cache(redis, problem_node_id).await?;

    log::info!("Successfully removed tag {} from problem {}", tag_node_id, problem_node_id);
    Ok(())
}

/// 获取当前用户节点ID
/// 从请求上下文中获取当前用户，实际应用中需要配合中间件使用
pub async fn get_current_user_node_id_from_context(
    _db: &DatabaseConnection,
    auth_context: Option<&crate::auth::context::AuthContext>,
) -> Option<i64> {
    auth_context.map(|ctx| ctx.user_node_id)
}

/// 从token获取当前用户节点ID
pub async fn get_current_user_node_id_from_token(
    db: &DatabaseConnection,
    token: &str,
) -> Result<Option<i64>> {
    let mut redis = crate::env::REDIS_CLIENT.lock().unwrap().get_connection().unwrap();
    match crate::auth::context::AuthManager::authenticate_user(db, &mut redis, token).await {
        Ok(Some(ctx)) => Ok(Some(ctx.user_node_id)),
        Ok(None) => Ok(None),
        Err(e) => Err(e),
    }
}

/// 为题目创建者授予必要的权限
pub async fn grant_problem_creator_permissions(
    db: &DatabaseConnection,
    user_node_id: i64,
    problem_node_id: i64,
) -> Result<()> {
    log::info!("Granting problem creator permissions: user {} -> problem {}", user_node_id, problem_node_id);

    // 授予题目权限
    PermProblemEdgeRaw {
        u: user_node_id,
        v: problem_node_id,
        perms: crate::graph::edge::perm_problem::ProblemPermRaw::Perms(vec![
            ProblemPerm::ReadProblem,
            ProblemPerm::EditProblem,
            ProblemPerm::DeleteProblem,
            ProblemPerm::ManageProblemPermissions,
        ]),
    }
    .save(db)
    .await?;

    // 授予页面权限
    PermPagesEdgeRaw {
        u: user_node_id,
        v: problem_node_id,
        perms: crate::graph::edge::perm_pages::PagesPermRaw::Perms(vec![
            PagesPerm::ReadPages,
            PagesPerm::EditPages,
            PagesPerm::PublishPages,
        ]),
    }
    .save(db)
    .await?;

    log::info!("Successfully granted problem creator permissions: user {} -> problem {}", user_node_id, problem_node_id);
    Ok(())
}

/// 带认证上下文的题目创建函数
pub async fn create_problem_with_auth(
    db: &DatabaseConnection,
    problem: CreateProblemProps,
    auth_context: Option<&crate::auth::context::AuthContext>,
) -> Result<ProblemNode> {
    log::info!("Creating new problem with auth context, name:{}", &problem.problem_name);

    let problem_node = create_problem(db, problem).await?;

    // 如果有认证上下文，为创建者授予权限
    if let Some(ctx) = auth_context {
        log::info!("Granting problem creator permissions for user {}", ctx.user_iden);
        grant_problem_creator_permissions(db, ctx.user_node_id, problem_node.node_id).await?;
    }

    Ok(problem_node)
}

/// 从token创建题目
pub async fn create_problem_with_token(
    db: &DatabaseConnection,
    problem: CreateProblemProps,
    token: &str,
) -> Result<ProblemNode> {
    log::info!("Creating new problem with token, name:{}", &problem.problem_name);

    let problem_node = create_problem(db, problem).await?;

    // 尝试从token获取用户并授予权限
    if let Ok(Some(user_node_id)) = get_current_user_node_id_from_token(db, token).await {
        log::info!("Granting problem creator permissions for user from token");
        grant_problem_creator_permissions(db, user_node_id, problem_node.node_id).await?;
    } else {
        log::warn!("Could not authenticate user from token, no permissions granted");
    }

    Ok(problem_node)
}

/// 为用户授予题目访问权限
pub async fn grant_problem_access(
    db: &DatabaseConnection,
    user_node_id: i64,
    problem_node_id: i64,
    can_view_private: bool,
) -> Result<()> {
    log::info!("Granting problem access: user {} -> problem {}, private: {}", user_node_id, problem_node_id, can_view_private);

    let mut problem_perms = vec![ProblemPerm::ReadProblem];
    if can_view_private {
        // 如果可以查看私有内容，也授予编辑权限
        problem_perms.push(ProblemPerm::EditProblem);
    }

    // 授予题目权限
    PermProblemEdgeRaw {
        u: user_node_id,
        v: problem_node_id,
        perms: crate::graph::edge::perm_problem::ProblemPermRaw::Perms(problem_perms),
    }
    .save(db)
    .await?;

    log::info!("Successfully granted problem access: user {} -> problem {}", user_node_id, problem_node_id);
    Ok(())
}

pub async fn check_problem_permission(
    db: &DatabaseConnection,
    user_node_id: i64,
    problem_node_id: i64,
    required_problem_perm: ProblemPerm,
) -> Result<bool> {
    use crate::model::perm::check_perm;

    match check_perm(
        db,
        user_node_id,
        problem_node_id,
        crate::graph::edge::perm_problem::PermProblemEdgeQuery,
        required_problem_perm.get_const_isize().unwrap() as i64,
    ).await? {
        1 => Ok(true),
        _ => Ok(false),
    }
}
