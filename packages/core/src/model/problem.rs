use crate::db::entity::node::problem_statement::ContentType;
use crate::error::{CoreError, QueryExists};
use crate::graph::action::get_node_type;
use crate::graph::edge::perm_problem::{PermProblemEdgeQuery};
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
use crate::graph::edge::testcase::{TestcaseEdge, TestcaseEdgeRaw};
use crate::graph::node::record::subtask::{SubtaskCalcMethod, SubtaskNodePrivateRaw, SubtaskNodePublicRaw, SubtaskNodeRaw};
use crate::model::user::SimplyUser;
use crate::service::iden::{create_iden, get_node_id_iden, get_node_ids_from_iden, remove_iden_to_specific_node};

type ProblemIdenString = String;

pub async fn create_problem_schema(
    db: &DatabaseConnection,
    redis: &mut redis::Connection,
    problem_statement: Vec<(
        ProblemStatementNodeRaw,
        ProblemLimitNodeRaw,
        Option<ProblemIdenString>,
    )>,
    tag_node_id: Vec<i64>,
    problem_name: &str,
) -> Result<ProblemNode> {
    log::debug!("Starting to create problem schema");
    let problem_node = ProblemNodeRaw {
        public: ProblemNodePublicRaw {
            name: problem_name.to_string(),
            creation_time: Utc::now().naive_utc(),
        },
        private: ProblemNodePrivateRaw {},
    }
    .save(db)
    .await?;
    let problem_node_id = problem_node.node_id;
    for data in problem_statement {
        add_problem_statement_for_problem(db, redis, problem_node_id, data).await?;
    }
    for tag_node in tag_node_id {
        ProblemTagEdgeRaw {
            u: problem_node.node_id,
            v: tag_node,
        }
        .save(db)
        .await?;
    }
    log::debug!(
        "Problem schema created. Problem node ID: {}",
        problem_node.node_id
    );
    Ok(problem_node)
}

pub async fn add_problem_statement_for_problem(
    db: &DatabaseConnection,
    redis: &mut redis::Connection,
    problem_node_id: i64,
    problem_statement: (
        ProblemStatementNodeRaw,
        ProblemLimitNodeRaw,
        Option<ProblemIdenString>,
    ),
) -> Result<ProblemStatementNode> {
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
        create_iden(db, redis, &format!("problem/{}", iden), vec![problem_statement_node.node_id, problem_node_id]).await?;
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
    let subtask_node = SubtaskNodeRaw {
        public: SubtaskNodePublicRaw {
            subtask_id: 0,
            time_limit: problem_limit_node.public.time_limit,
            memory_limit: problem_limit_node.public.memory_limit,
            subtask_calc_method: SubtaskCalcMethod::Sum,
            is_root: true,
        },
        private: SubtaskNodePrivateRaw { subtask_calc_function: None },
    }.save(db).await?;
    TestcaseEdgeRaw {
        u: problem_statement_node.node_id,
        v: subtask_node.node_id,
        order: 0,
    }.save(db).await?;
    Ok(problem_statement_node)
}

pub fn generate_problem_statement_schema(statement: ProblemStatementProp) -> (ProblemStatementNodeRaw, ProblemLimitNodeRaw, Option<ProblemIdenString>) {
    (ProblemStatementNodeRaw {
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
    }, ProblemLimitNodeRaw {
        public: ProblemLimitNodePublicRaw {
            time_limit: statement.time_limit,
            memory_limit: statement.memory_limit,
        },
        private: ProblemLimitNodePrivateRaw {},
    }, Some(statement.iden))
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
    pub iden: String,   // used to create problem_iden node
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

pub async fn create_problem_with_user(
    db: &DatabaseConnection,
    redis: &mut redis::Connection,
    problem: &CreateProblemProps,
    public_view: bool,
) -> Result<ProblemNode> {
    log::debug!("Creating new problem: {}", &problem.problem_name);
    // check iden existence
    let existing_ids = get_node_ids_from_iden(db, redis, format!("problem/{}", problem.problem_iden).as_str()).await;
    log::info!("Checking existence for problem iden: {}", &problem.problem_iden);
    if existing_ids.is_ok() {
        return Err(CoreError::QueryExists(QueryExists::ProblemExist));
    }
    let problem_node_raw = ProblemNodeRaw {
        public: ProblemNodePublicRaw {
            name: problem.problem_name.clone(),
            creation_time: problem.creation_time.unwrap_or(Utc::now().naive_utc()),
        },
        private: ProblemNodePrivateRaw {},
    };
    log::trace!("Problem Node Raw: {problem_node_raw:?}");
    let mut problem_statement_node_raw = vec![];
    for statement in &problem.problem_statement {
        problem_statement_node_raw.push(generate_problem_statement_schema(statement.clone()));
    }
    log::trace!("Problem Statements Raw: {problem_statement_node_raw:?}");
    let mut tag_ids = vec![];
    for i in &problem.tags {
        use db::entity::node::problem_tag::Column as ProblemTagColumn;
        log::trace!("Finding tag {i} in database");
        let id = ProblemTagNode::from_db_filter(db, ProblemTagColumn::TagName.eq(i)).await?;
        tag_ids.push(if id.is_empty() {
            log::trace!("Tag {i} not found, creating new.");
            ProblemTagNodeRaw {
                public: ProblemTagNodePublicRaw {
                    tag_name: i.clone(),
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
    log::trace!("Final problem tags ID list: {:?}", tag_ids);
    log::trace!("Data collected");
    let result = create_problem_schema(
        db,
        redis,
        problem_statement_node_raw,
        tag_ids,
        &problem.problem_name,
    )
    .await?;
    log::debug!("Creating problem_source for problem");
    create_iden(
        db,
        redis,
        &format!("problem/{}", problem.problem_iden),
        vec![result.node_id],
    ).await?;
    log::info!("Problem created: {}", &problem.problem_name);
    grant_problem_creator_permissions(db, problem.user_id, result.node_id).await?;
    MiscEdgeRaw {
        u: problem.user_id,
        v: result.node_id,
        misc_type: "author".to_string(),
    }.save(db).await?;
    if public_view { // give default public view permission
        let u = crate::env::DEFAULT_NODES.lock().unwrap().guest_user_node;
        PermProblemEdgeRaw {
            u,
            v: result.node_id,
            perms: crate::graph::edge::perm_problem::ProblemPermRaw::Perms(vec![
                ProblemPerm::ReadProblem,
            ]),
        }.save(db).await?;
    }
    Ok(result)
}


#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ProblemModel {
    pub problem_node: ProblemNode,
    pub problem_statement_node: Vec<(ProblemStatementNode, ProblemLimitNode)>,
    pub tag: Vec<ProblemTagNode>,
    pub author: Option<SimplyUser>,
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

pub async fn get_problem_iden(
    db: &DatabaseConnection,
    redis: &mut redis::Connection,
    problem_node_id: i64,
) -> Result<String> {
    let iden_list = get_node_id_iden(db, redis, problem_node_id).await?;
    for iden in iden_list {
        if iden.starts_with("problem") {
            return Ok(iden["problem".len()..].to_string());
        }
    }
    Err(CoreError::NotFound("Cannot find problem iden for this problem".to_string()))
}

pub async fn get_problem_node_and_statement(
    db: &DatabaseConnection,
    redis: &mut redis::Connection,
    iden: &str,
) -> Result<(i64, i64)> {
    let node_ids = get_node_ids_from_iden(db, redis, format!("problem/{iden}").as_str()).await?;
    if node_ids.is_empty() {
        return Err(CoreError::NotFound("Cannot find problem with this iden".to_string()));
    }
    if node_ids.len() == 1 {
        Ok((node_ids[0], node_ids[0]))
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
            log::warn!("{iden}: Multiple nodes found for this iden, but cannot find a statement node!");
        }
        Ok((problem_node, statement_node))
    }
}

pub async fn get_problem(
    db: &DatabaseConnection,
    redis: &mut redis::Connection,
    iden: &str,
) -> Result<(ProblemModel, i64)> {
    let (problem_node, statement_node) = get_problem_node_and_statement(db, redis, iden).await?;
    Ok((get_problem_model(db, redis, problem_node).await?, statement_node))
}

pub async fn get_problem_with_node_id(
    db: &DatabaseConnection,
    redis: &mut redis::Connection,
    node_id: i64,
) -> Result<ProblemModel> {
    get_problem_model(db, redis, node_id).await
}

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
    let author_node_id = MiscEdgeQuery::get_u_filter(problem_node.node_id, MiscColumn::MiscType.eq("author"), db).await?;
    let author = if !author_node_id.is_empty() {
        let author_node = crate::model::user::SimplyUser::from_db(db, author_node_id[0]).await.unwrap_or(SimplyUser { node_id:  author_node_id[0], name: "unknown".to_string(), iden: "unknown".to_string(), avatar: "default".to_string() });
        Some(author_node)
    } else {
        None
    };
    let problem_model = ProblemModel {
        problem_node,
        problem_statement_node,
        tag,
        author,
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
    new_source: &str,
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
    problem_node_id: i64,
) -> Result<()> {


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

    Ok(())
}

/// Remove a specific statement from a problem (delete edges only)
pub async fn remove_statement_from_problem(
    db: &DatabaseConnection,
    redis: &mut redis::Connection,
    problem_node_id: i64,
    statement_node_id: i64,
) -> Result<()> {
    log::debug!("Removing statement {} from problem {}", statement_node_id, problem_node_id);

    // Delete problem-limit edges using EdgeQuery
    let limit_node_ids = ProblemLimitEdgeQuery::get_v(statement_node_id, db).await?;
    for limit_node_id in limit_node_ids {
        ProblemLimitEdgeQuery::delete(db, statement_node_id, limit_node_id).await?;
        log::debug!("Deleted problem-limit edge: {} -> {}", statement_node_id, limit_node_id);
    }


    // check iden for statement id

    let iden = get_node_id_iden(db, redis, statement_node_id).await?;

    // delete all iden.
    for i in iden {
        remove_iden_to_specific_node(db, &i, statement_node_id).await?;
    }


    // Delete problem-statement edge using EdgeQuery
    ProblemStatementEdgeQuery::delete(db, problem_node_id, statement_node_id).await?;

    // Refresh problem cache
    refresh_problem_node_cache(redis, problem_node_id).await?;

    log::debug!("Successfully removed statement {} from problem {}", statement_node_id, problem_node_id);
    Ok(())
}

/// Remove a tag from a problem (delete edge only)
pub async fn remove_tag_from_problem(
    db: &DatabaseConnection,
    redis: &mut redis::Connection,
    problem_node_id: i64,
    tag_node_id: i64,
) -> Result<()> {
    log::debug!("Removing tag {} from problem {}", tag_node_id, problem_node_id);

    // Delete the problem-tag edge using EdgeQuery
    ProblemTagEdgeQuery::delete(db, problem_node_id, tag_node_id).await?;

    // Refresh problem cache
    refresh_problem_node_cache(redis, problem_node_id).await?;

    log::debug!("Successfully removed tag {} from problem {}", tag_node_id, problem_node_id);
    Ok(())
}

pub async fn grant_problem_creator_permissions(
    db: &DatabaseConnection,
    user_node_id: i64,
    problem_node_id: i64,
) -> Result<()> {
    log::debug!("Granting problem creator permissions: user {} -> problem {}", user_node_id, problem_node_id);

    // 授予题目权限
    PermProblemEdgeRaw {
        u: user_node_id,
        v: problem_node_id,
        perms: crate::graph::edge::perm_problem::ProblemPermRaw::Perms(vec![
            ProblemPerm::ReadProblem,
            ProblemPerm::EditProblem,
            ProblemPerm::DeleteProblem,
            ProblemPerm::OwnProblem,
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

    log::debug!("Successfully granted problem creator permissions: user {} -> problem {}", user_node_id, problem_node_id);
    Ok(())
}
pub async fn grant_problem_access(
    db: &DatabaseConnection,
    user_node_id: i64,
    problem_node_id: i64,
    can_view_private: bool,
) -> Result<()> {
    log::debug!("Granting problem access: user {} -> problem {}, private: {}", user_node_id, problem_node_id, can_view_private);

    let mut problem_perms = vec![ProblemPerm::ReadProblem];
    if can_view_private {
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

    log::debug!("Successfully granted problem access: user {} -> problem {}", user_node_id, problem_node_id);
    Ok(())
}

pub async fn add_owner(
    db: &DatabaseConnection,
    user_node_id: i64,
    problem_node_id: i64,
) -> Result<()> {
    log::debug!("Adding owner: user {} -> problem {}", user_node_id, problem_node_id);

    // 授予用户题目所有权限
    PermProblemEdgeRaw {
        u: user_node_id,
        v: problem_node_id,
        perms: crate::graph::edge::perm_problem::ProblemPermRaw::Perms(vec![
            ProblemPerm::OwnProblem,
        ]),
    }
    .save(db)
    .await?;

    log::debug!("Successfully added owner: user {} -> problem {}", user_node_id, problem_node_id);
    Ok(())
}

pub async fn delete_owner(
    db: &DatabaseConnection,
    user_node_id: i64,
    problem_node_id: i64,
) -> Result<()> {
    log::debug!("Deleting owner: user {} -> problem {}", user_node_id, problem_node_id);

    // 删除用户题目所有权限
    PermProblemEdgeQuery::delete(db, user_node_id, problem_node_id).await?;

    log::debug!("Successfully deleted owner: user {} -> problem {}", user_node_id, problem_node_id);
    Ok(())
}

pub async fn add_editor(
    db: &DatabaseConnection,
    user_node_id: i64,
    problem_node_id: i64,
) -> Result<()> {
    log::debug!("Adding editor: user {} -> problem {}", user_node_id, problem_node_id);

    // 授予用户题目编辑权限
    PermProblemEdgeRaw {
        u: user_node_id,
        v: problem_node_id,
        perms: crate::graph::edge::perm_problem::ProblemPermRaw::Perms(vec![
            ProblemPerm::EditProblem,
        ]),
    }
    .save(db)
    .await?;

    log::debug!("Successfully added editor: user {} -> problem {}", user_node_id, problem_node_id);
    Ok(())
}

pub async fn delete_editor(
    db: &DatabaseConnection,
    user_node_id: i64,
    problem_node_id: i64,
) -> Result<()> {
    log::debug!("Deleting editor: user {} -> problem {}", user_node_id, problem_node_id);

    // 删除用户题目编辑权限
    PermProblemEdgeQuery::delete(db, user_node_id, problem_node_id).await?;

    log::debug!("Successfully deleted editor: user {} -> problem {}", user_node_id, problem_node_id);
    Ok(())
}

pub async fn add_viewer(
    db: &DatabaseConnection,
    user_node_id: i64,
    problem_node_id: i64,
) -> Result<()> {
    log::debug!("Adding viewer: user {} -> problem {}", user_node_id, problem_node_id);

    // 授予用户题目查看权限
    PermProblemEdgeRaw {
        u: user_node_id,
        v: problem_node_id,
        perms: crate::graph::edge::perm_problem::ProblemPermRaw::Perms(vec![
            ProblemPerm::ReadProblem,
        ]),
    }
    .save(db)
    .await?;

    log::debug!("Successfully added viewer: user {} -> problem {}", user_node_id, problem_node_id);
    Ok(())
}

pub async fn delete_viewer(
    db: &DatabaseConnection,
    user_node_id: i64,
    problem_node_id: i64,
) -> Result<()> {
    log::debug!("Deleting viewer: user {} -> problem {}", user_node_id, problem_node_id);

    // 删除用户题目查看权限
    PermProblemEdgeQuery::delete(db, user_node_id, problem_node_id).await?;

    log::debug!("Successfully deleted viewer: user {} -> problem {}", user_node_id, problem_node_id);
    Ok(())
}