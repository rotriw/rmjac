use crate::{
    db::entity::node::problem_statement::ContentType,
    graph::{
        edge::{
            perm_manage::{ManagePerm, PermManageEdgeRaw},
            perm_view::{PermViewEdgeRaw, ViewPerm},
            problem_statement::ProblemStatementEdgeRaw,
            EdgeRaw,
        },
        node::{
            problem::{
                statement::{
                    ProblemStatementNodePrivateRaw, ProblemStatementNodePublicRaw,
                    ProblemStatementNodeRaw,
                },
                ProblemNode, ProblemNodePrivateRaw, ProblemNodePublicRaw, ProblemNodeRaw,
            },
            NodeRaw,
        },
    },
    Result,
};
use sea_orm::DatabaseConnection;

pub async fn create_problem(
    db: &DatabaseConnection,
    problem_statement: Vec<ContentType>,
    problem_statement_source: String,
    problem_statement_iden: String,
    copyright_risk: i64,
    problem_name: String,
) -> Result<ProblemNode> {
    let problem_node = ProblemNodeRaw {
        public: ProblemNodePublicRaw {
            name: problem_name,
            creation_time: chrono::Utc::now().naive_utc(),
        },
        private: ProblemNodePrivateRaw {},
    }
    .save(db)
    .await?;

    let problem_statement_node = ProblemStatementNodeRaw {
        public: ProblemStatementNodePublicRaw {
            creation_time: chrono::Utc::now().naive_utc(),
            statements: problem_statement,
            source: problem_statement_source,
            iden: problem_statement_iden,
        },
        private: ProblemStatementNodePrivateRaw {},
    }
    .save(db)
    .await?;
    ProblemStatementEdgeRaw {
        u: problem_node.node_id,
        v: problem_statement_node.node_id,
        copyright_risk: copyright_risk,
    }
    .save(db)
    .await?;
    PermViewEdgeRaw {
        u: problem_node.node_id,
        v: problem_statement_node.node_id,
        perms: vec![ViewPerm::All],
    }
    .save(db)
    .await?;
    PermManageEdgeRaw {
        u: problem_node.node_id,
        v: problem_statement_node.node_id,
        perms: vec![ManagePerm::All],
    }
    .save(db)
    .await?;
    Ok(problem_node)
}
