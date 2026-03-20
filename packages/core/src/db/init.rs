use std::collections::HashMap;

use async_trait::async_trait;
use log::LevelFilter;
use sea_orm::{self, ConnectOptions, Database};
use sea_orm_migration::prelude::*;
use macro_db_init::table_create;
use crate::db;
use crate::db::EntityServer;
use crate::error::CoreError;

#[derive(DeriveMigrationName)]
pub struct Migration;

fn get_tables() -> HashMap<String, TableCreateStatement> {
    let mut tables = HashMap::new();
    tables.insert(
        "edge_event_problem".to_string(),
        table_create!(db::iden::edge::event_problem::Enum, {
            EdgeId: big_integer not_null primary_key auto_increment,
            EventId: big_integer not_null,
            ProblemId: big_integer not_null,
            Iden: string not_null,
        }),
    );
    tables.insert(
        "edge_judge".to_string(),
        table_create!(db::iden::edge::judge::Enum, {
            EdgeId: big_integer not_null primary_key auto_increment,
            RecordId: big_integer not_null,
            TestcaseId: big_integer not_null,
            JudgeInfo: json_binary not_null,
        }),
    );
    tables.insert(
        "edge_misc".to_string(),
        table_create!(db::iden::edge::misc::Enum, {
            EdgeId: big_integer not_null primary_key auto_increment,
            From: big_integer not_null,
            To: big_integer not_null,
            EdgeType: big_integer not_null,
        }),
    );
    tables.insert(
        "edge_perm_manage".to_string(),
        table_create!(db::iden::edge::perm_manage::Enum, {
            EdgeId: big_integer not_null primary_key auto_increment,
            UNodeId: big_integer not_null,
            VNodeId: big_integer not_null,
            Perm: big_integer not_null,
        }),
    );
    tables.insert(
        "edge_perm_system".to_string(),
        table_create!(db::iden::edge::perm_system::Enum, {
            EdgeId: big_integer not_null primary_key auto_increment,
            UNodeId: big_integer not_null,
            VNodeId: big_integer not_null,
            Perm: big_integer not_null,
        }),
    );
    tables.insert(
        "edge_problem".to_string(),
        table_create!(db::iden::edge::problem::Enum, {
            EdgeId: big_integer not_null primary_key auto_increment,
            TimeLimit: big_integer not_null,
            MemoryLimit: big_integer not_null,
            Difficulty: big_integer not_null,
            Platform: string not_null,
            Iden: string not_null,
            Name: string not_null,
            AuthorId: big_integer not_null,
        }),
    );
    tables.insert(
        "edge_record".to_string(),
        table_create!(db::iden::edge::record::Enum, {
            EdgeId: big_integer not_null primary_key auto_increment,
            Time: big_integer not_null,
            Memory: big_integer not_null,
            UserId: big_integer not_null,
            ProblemId: big_integer not_null,
            Code: text not_null,
            RecordId: big_integer not_null,
            Status: json_binary not_null,
            Language: text not_null,
            Score: double not_null,
        }),
    );
    tables.insert(
        "edge_search".to_string(),
        table_create!(db::iden::edge::search::Enum, {
            EdgeId: big_integer not_null primary_key auto_increment,
            Difficulty: big_integer null,
            Content: text not_null,
            Id: big_integer not_null,
            Name: string not_null,
            Iden: string not_null,
            Typed: string not_null,
            Platform: string not_null,
        }),
    );
    tables.insert(
        "edge_todo_list".to_string(),
        table_create!(db::iden::edge::todolist_ownproblem::Enum, {
            EdgeId: big_integer not_null primary_key auto_increment,
            Order: big_integer not_null,
            Description: text not_null,
            ProblemIden: string not_null,
        }),
    );
    tables.insert(
        "edge_user".to_string(),
        table_create!(db::iden::edge::user::Enum, {
            EdgeId: big_integer not_null primary_key auto_increment,
            UserIden: string not_null,
            Email: string not_null,
            UserId: big_integer not_null,
        }),
    );
    tables.insert(
        "edge_user_show".to_string(),
        table_create!(db::iden::edge::user_own::Enum, {
            EdgeId: big_integer not_null primary_key auto_increment,
            UserId: big_integer not_null,
            Data: json_binary not_null,
            Order: big_integer not_null,
            Description: text null,
            PublicHide: boolean not_null,
        }),
    );
    tables
}

fn get_drop_tables() -> HashMap<String, TableDropStatement> {
    let mut tables = HashMap::new();
    tables.insert(
        "edge_event_problem".to_string(),
        Table::drop()
            .table(db::iden::edge::event_problem::Enum::Table)
            .if_exists()
            .to_owned(),
    );
    tables.insert(
        "edge_judge".to_string(),
        Table::drop()
            .table(db::iden::edge::judge::Enum::Table)
            .if_exists()
            .to_owned(),
    );
    tables.insert(
        "edge_misc".to_string(),
        Table::drop()
            .table(db::iden::edge::misc::Enum::Table)
            .if_exists()
            .to_owned(),
    );
    tables.insert(
        "edge_perm_manage".to_string(),
        Table::drop()
            .table(db::iden::edge::perm_manage::Enum::Table)
            .if_exists()
            .to_owned(),
    );
    tables.insert(
        "edge_perm_system".to_string(),
        Table::drop()
            .table(db::iden::edge::perm_system::Enum::Table)
            .if_exists()
            .to_owned(),
    );
    tables.insert(
        "edge_problem".to_string(),
        Table::drop()
            .table(db::iden::edge::problem::Enum::Table)
            .if_exists()
            .to_owned(),
    );
    tables.insert(
        "edge_record".to_string(),
        Table::drop()
            .table(db::iden::edge::record::Enum::Table)
            .if_exists()
            .to_owned(),
    );
    tables.insert(
        "edge_search".to_string(),
        Table::drop()
            .table(db::iden::edge::search::Enum::Table)
            .if_exists()
            .to_owned(),
    );
    tables.insert(
        "edge_todo_list".to_string(),
        Table::drop()
            .table(db::iden::edge::todolist_ownproblem::Enum::Table)
            .if_exists()
            .to_owned(),
    );
    tables.insert(
        "edge_user".to_string(),
        Table::drop()
            .table(db::iden::edge::user::Enum::Table)
            .if_exists()
            .to_owned(),
    );
    tables.insert(
        "edge_user_show".to_string(),
        Table::drop()
            .table(db::iden::edge::user_own::Enum::Table)
            .if_exists()
            .to_owned(),
    );
    tables
}

#[async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manage: &SchemaManager) -> Result<(), DbErr> {
        let tables = get_tables();
        for (name, table) in tables {
            log::info!("Creating table: {name}");
            manage.create_table(table).await?;
        }
        Ok(())
    }

    async fn down(&self, manage: &SchemaManager) -> Result<(), DbErr> {
        let tables = get_drop_tables();
        for (name, table) in tables {
            log::info!("Dropping table: {name}");
            manage.drop_table(table).await?;
        }
        Ok(())
    }
}

pub struct Migrator;

#[async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![Box::new(Migration)]
    }
}

#[tokio::main]
pub async fn init(
    url: &str,
    schema: &str,
    mode: &str,
    up: Vec<&str>,
    down: Vec<&str>,
) -> Result<(), CoreError> {
    let connection_options = ConnectOptions::new(url)
        .set_schema_search_path(schema)
        .max_connections(100)
        .sqlx_logging_level(LevelFilter::Trace)
        .to_owned();
    log::info!("Database Update: {}", up.join(", "));
    log::info!("Database Drop: {}", down.join(", "));
    log::info!("Database connecting...");
    let db = Database::connect(connection_options).await?;
    log::info!("Database connected");
    if down.contains(&"all") {
        log::error!("Dropping all tables, this will delete all data in the database!");
        if mode != "dev" {
            log::error!(
                "Dropping all is only available in development mode!(use --mode dev to confirm this action)"
            );
        }
        let _ = Migrator::down(&db, None).await;
    } else {
        let manager = SchemaManager::new(&db);
        let tables = get_drop_tables();
        for (name, table) in tables {
            if down.contains(&name.as_str()) {
                log::info!("Dropping table: {name}");
                manager.drop_table(table).await?;
            }
        }
    }
    if up.contains(&"all") {
        let _ = Migrator::up(&db, None).await;
    } else {
        let manager = SchemaManager::new(&db);
        let tables = get_tables();
        for (name, table) in tables {
            if up.contains(&name.as_str()) {
                log::info!("Creating table: {name}");
                manager.create_table(table).await?;
            }
        }
    }

    Ok(())
}
