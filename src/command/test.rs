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

pub fn run() -> Option<()> {
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
    Some(())
}
