//! router: test
//! description: Test something
//! log_level required
//! --config -c <config>, Server will use this config file

// use core::async_run;

// use log::LevelFilter;
// use sea_orm::ConnectOptions;

// use crate::{
//     env::env_load, utils,
// };

use core::async_run;
use core::graph::node::record::subtask::SubtaskCalcMethod;
use core::service::judge::calc::handle_score;
use core::graph::node::record::RecordStatus::Accepted;
use core::model::problem::get_problem;
use core::model::problem::ProblemStatementProp;
use core::model::problem::CreateProblemProps;
use core::model::problem::create_problem;

use log::LevelFilter;
use sea_orm::DatabaseConnection;

use crate::utils;

pub async fn test_get_problem(db: &DatabaseConnection) {
    let redis = redis::Client::open("redis://127.0.0.1/").unwrap();
    let x = get_problem(db, &mut redis.get_connection().unwrap(), "rmj1000").await;
    log::info!("{:?}", x);
    let x = get_problem(db, &mut redis.get_connection().unwrap(), "LGP1001").await;
    log::info!("{:?}", x);
}


pub async fn test_create_training(db: &DatabaseConnection) {
    let redis = redis::Client::open("redis://127.0.0.1/").unwrap();
    let _conn = std::env::var("DB").unwrap();
    use core::model::training::TrainingProblem::*;
    use core::model::training::TrainingList;
    {
        let v = core::model::training::create_training(
            db,
            &mut redis.get_connection().unwrap(),
        "Test Training",
            "user1",
        "test_training",
        "This is a test training.",
        "This is a private description.",
        chrono::Utc::now().naive_utc(),
        chrono::Utc::now().naive_utc() + chrono::Duration::days(4),
            "public",
            &TrainingList {
                description: "开始".to_string(),
                own_problem: vec![ProblemIden("LGP1001".to_string()), ProblemTraining(TrainingList {
                    description: "中间".to_string(),
                    own_problem: vec![ProblemIden("rmj1000".to_string())],
                })],
            }, vec![], vec![]).await;
        log::info!("Training created: {:?}", v);
    }
}

pub async fn test_create_problem(db: &DatabaseConnection) {
    use core::db::entity::node::problem_statement::ContentType;
    let _conn = std::env::var("DB").unwrap(); {
        let v = create_problem(db, CreateProblemProps {
            problem_name: "Test Problem".to_string(),
            problem_iden: "rmj1000".to_string(),
            problem_statement: vec![ProblemStatementProp {
                statement_source: "Rmjac".to_string(),
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
                problem_iden: Some("LGP1001".to_string()),
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
        log::info!("Problem created: {:?}", v);
    }
}

pub fn test_handle_score() {
    let test_detail = vec![(10f64, 1, 1, Accepted), (90f64, 1, 1, Accepted)];
    let _ = dbg!(handle_score(SubtaskCalcMethod::Sum, None, test_detail));
    let test_detail = vec![(10f64, 1, 1, Accepted), (90f64, 1, 1, Accepted)];
    let _ = dbg!(handle_score(SubtaskCalcMethod::Function, None, test_detail));
}

pub fn run(log_level: Option<String>) -> Option<()> {
        let log_level: LevelFilter = log_level
            .unwrap_or_else(|| "info".to_string())
            .parse()
            .unwrap_or(LevelFilter::Info);
        let _ = utils::logger::setup_logger_with_stdout(log_level);

    // let config = config.unwrap_or_else(|| "config.json".to_string());
    /*  let log_level: LevelFilter = log_level
            .unwrap_or_else(|| "info".to_string())
            .parse()
            .unwrap_or(LevelFilter::Info);
        let _ = utils::logger::setup_logger_with_stdout(log_level);
        // env_load(&config);
        async_run! {
            let database_url = crate::env::CONFIG
                .lock()
                .unwrap()
                .postgres_url
                .clone()
                .ok_or_else(|| {
                    std::io::Error::new(std::io::ErrorKind::NotFound, "Postgres URL not found")
                }).unwrap();
            log::info!("Connecting to database {}...", &database_url);
            /*  let connection_options = ConnectOptions::new(database_url)
                .sqlx_logging_level(LevelFilter::Trace)
             */   /*  .to_owned(); */
            // let conn = Database::connect(connection_options).await.unwrap();
            /* for i in 3..10000 {
                PermViewEdgeRaw {
                    u: i,
                    v: 1,
                    perms: vec![ViewPerm::All].into(),
                }.save(&conn).await;
            }
            for i in 10000..11000 {
                PermViewEdgeRaw {
                    u: i,
                    v: 1,
                    perms: vec![ViewPerm::All].into(),
                }.save(&conn).await;
            }
     */
    // for i in 11000..12000 {
    //     PermViewEdgeRaw {
    //         u: 1,
    //         v: i,
    //         perms: vec![ViewPerm::All].into(),
    //     }.save(&conn).await;
    // }
    //         dbg!(has_path(
    //             &conn,
    //             3,
    //             11000,
    //             &PermViewEdgeQuery,
    //             ViewPerm::All as i64
    //         ).await);
        } */

    core::service::iden::create_words(vec!["LG"]);
    dbg!(core::service::iden::auto_slice_iden("LGP1001"));
    dbg!(core::service::iden::auto_slice_iden("LG/P1001"));
    dbg!(core::service::iden::auto_slice_iden("problem/LG/P1001"));
    let conn = std::env::var("DB").unwrap(); async_run! {

        let db = sea_orm::Database::connect(&conn).await.unwrap();
        let _ = core::service::service_start(&db, &conn, "public", 1825, "").await;
        // test_get_problem(&db).await;
        let redis = redis::Client::open("redis://127.0.0.1/").unwrap();
        let x = core::service::iden::get_node_id_iden(10, &db, &mut redis.get_connection().unwrap()).await;
        log::info!("{:?}", x);
        // test_create_problem(&db).await;
        // test_create_training(&db).await;

        log::warn!("start");
        /* for i in 1..=20000 {
            let _ = create_default_user(&db, format!("test_user_{i}").as_str(), format!("test_user_{i}").as_str(), format!("test_user_{i}@126.com").as_str(), format!("example.com/a.png").as_str(), "123456").await;
        } */
        // init_spot(&db, &PermViewEdgeQuery, 3, 20004).await.unwrap();
        // log::warn!("start");
        // for i in 4..=20000 {
        //     let a = has_path(&db, i, 0, &PermViewEdgeQuery, vec![ViewPerm::ReadProblem].conv::<Perms>().into()).await;
        //     if i % 1000 == 0 {
        //         log::info!("{i} done.");
        //     }
        // }
        // log::warn!("end");
    }
    test_handle_score();
    Some(())
}
