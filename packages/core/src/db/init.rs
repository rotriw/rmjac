use std::collections::HashMap;

use async_trait::async_trait;
use log::LevelFilter;
use macro_db_init::table_create;
use sea_orm::{ConnectOptions, Database};
use sea_orm_migration::prelude::*;

use crate::{db::iden, error::CoreError};

#[derive(DeriveMigrationName)]
pub struct Migration;

fn get_tables() -> HashMap<String, TableCreateStatement> {
    let mut tables = HashMap::new();
    tables.insert(
        format!("node"),
        table_create!(iden::node::node::Node, {
            NodeId: big_integer not_null primary_key auto_increment,
            NodeIden: text not_null,
            NodeType: text not_null,
        }),
    );
    tables.insert(
        format!("node_user"),
        table_create!(iden::node::user::User, {
            NodeId: big_integer not_null primary_key,
            UserName: text not_null,
            UserEmail: text not_null,
            UserPassword: text not_null,
            UserAvatar: text not_null,
            UserCreationTime: date_time not_null,
            UserCreationOrder: big_integer not_null auto_increment,
            UserLastLoginTime: date_time not_null,
            UserDescription: text,
            UserIden: text not_null,
            UserBio: text,
            UserProfileShow: text,
        }),
    );
    tables.insert(
        format!("node_token"),
        table_create!(iden::node::token::Token, {
            NodeId: big_integer not_null primary_key,
            Token: text not_null,
            TokenType: text not_null,
            TokenExpiration: date_time not_null,
            Service: text not_null,
            TokenIden: text not_null,
        }),
    );
    tables.insert(
        format!("node_problem_statement"),
        table_create!(iden::node::problem_statement::ProblemStatement, {
            NodeId: big_integer not_null primary_key,
            Iden: text not_null,
            Source: text not_null,
            Content: text not_null,
            CreationTime: date_time not_null,
            UpdateTime: date_time not_null,
        }),
    );
    tables.insert(
        format!("node_pages"),
        table_create!(iden::node::pages::Pages, {
            NodeId: big_integer not_null primary_key,
            NodeIden: text not_null,
            Iden: text not_null,
        }),
    );
    tables.insert(
        format!("edge"),
        table_create!(iden::edge::edge::Edge, {
            EdgeId: big_integer not_null primary_key auto_increment,
            EdgeType: text not_null,
        }),
    );
    tables.insert(
        format!("edge_perm_view"),
        table_create!(iden::edge::perm_view::PermView, {
            EdgeId: big_integer not_null primary_key,
            UNodeId: big_integer not_null,
            VNodeId: big_integer not_null,
            Perm: big_integer not_null,
        }),
    );
    tables.insert(
        format!("edge_perm_manage"),
        table_create!(iden::edge::perm_manage::PermManage, {
            EdgeId: big_integer not_null primary_key,
            UNodeId: big_integer not_null,
            VNodeId: big_integer not_null,
            Perm: big_integer not_null,
        }),
    );
    tables.insert(
        format!("edge_problem_statement"),
        table_create!(iden::edge::problem_statement::ProblemStatement, {
            EdgeId: big_integer not_null primary_key,
            UNodeId: big_integer not_null,
            VNodeId: big_integer not_null,
            CopyrightRisk: text not_null,
        }),
    );
    return tables;
}

fn get_drop_tables() -> HashMap<String, TableDropStatement> {
    let mut tables = HashMap::new();
    tables.insert(
        format!("node"),
        Table::drop()
            .table(iden::node::node::Node::Table)
            .if_exists()
            .to_owned(),
    );
    tables.insert(
        format!("node_user"),
        Table::drop()
            .table(iden::node::user::User::Table)
            .if_exists()
            .to_owned(),
    );
    tables.insert(
        format!("node_token"),
        Table::drop()
            .table(iden::node::token::Token::Table)
            .if_exists()
            .to_owned(),
    );
    tables.insert(
        format!("node_problem_statement"),
        Table::drop()
            .table(iden::node::problem_statement::ProblemStatement::Table)
            .if_exists()
            .to_owned(),
    );
    tables.insert(
        format!("edge"),
        Table::drop()
            .table(iden::edge::edge::Edge::Table)
            .if_exists()
            .to_owned(),
    );
    tables.insert(
        format!("edge_perm_view"),
        Table::drop()
            .table(iden::edge::perm_view::PermView::Table)
            .if_exists()
            .to_owned(),
    );
    return tables;
}

#[async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manage: &SchemaManager) -> Result<(), DbErr> {
        let tables = get_tables();
        for (name, table) in tables {
            log::info!("Creating table: {}", name);
            manage.create_table(table).await?;
        }
        Ok(())
    }

    async fn down(&self, manage: &SchemaManager) -> Result<(), DbErr> {
        let tables = get_drop_tables();
        for (name, table) in tables {
            log::info!("Dropping table: {}", name);
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
    up: Vec<&str>,
    down: Vec<&str>,
) -> Result<(), CoreError> {
    let connection_options = ConnectOptions::new(url)
        .set_schema_search_path(schema)
        .max_connections(10)
        .sqlx_logging_level(LevelFilter::Trace)
        .to_owned();
    log::info!("Database Update: {}", up.join(", "));
    log::info!("Database Drop: {}", down.join(", "));
    log::info!("Database connecting...");
    let db = Database::connect(connection_options).await.unwrap();
    log::info!("Database connected");
    if down.contains(&"all") {
        let _ = Migrator::down(&db, None).await;
    } else {
        let manager = SchemaManager::new(&db);
        let tables = get_drop_tables();
        for (name, table) in tables {
            if down.contains(&name.as_str()) {
                log::info!("Dropping table: {}", name);
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
                log::info!("Creating table: {}", name);
                manager.create_table(table).await?;
            }
        }
    }
    log::info!("Database migrated");
    Ok(())
}
