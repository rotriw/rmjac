use core::model::problem::ProblemStatementProp;
use core::{
    async_run,
    model::{problem::CreateProblemProps, problem::create_problem},
};

#[cfg(test)]
#[test]
pub fn test_create_problem() {
    use core::db::entity::node::problem_statement::ContentType;

    let conn = std::env::var("DB").unwrap();
    async_run! {
        let db = sea_orm::Database::connect(conn).await.unwrap();
        let _ = create_problem(&db, CreateProblemProps {
            problem_name: "Test Problem".to_string(),
            problem_source: "rmj".to_string(),
            problem_iden: "1000".to_string(),
            problem_statement: vec![ProblemStatementProp {
                statement_source: "Rmjac".to_string(),
                problem_source: None,
                problem_iden: None,
                problem_statements: vec![ContentType {
                    iden: "Background".to_string(),
                    content: "== Background\nasdf".to_string()
                }, ContentType {
                    iden: "Statement".to_string(),
                    content: "== Statement\nA+B Problem.".to_string()
                }],
                time_limit: 512,
                memory_limit: 1024,
            }, ProblemStatementProp {
                statement_source: "洛谷".to_string(),
                problem_source: Some("LG".to_string()),
                problem_iden: Some("P1001".to_string()),
                problem_statements: vec![ContentType {
                    iden: "Background".to_string(),
                    content: "== Background\nasdf".to_string()
                }, ContentType {
                    iden: "Statement".to_string(),
                    content: "== Statement\nA+B Problem. Luogu version".to_string()
                }],
                time_limit: 512,
                memory_limit: 1024,
            }],
            tags: vec!["简单模拟".to_string(), "数学".to_string()],
            creation_time: None,
        }).await;
    }
}
