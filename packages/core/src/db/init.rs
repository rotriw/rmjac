use async_trait::async_trait;
use log::LevelFilter;
use macro_db_init::table_create;
use sea_orm::{ConnectOptions, Database};
use sea_orm_migration::prelude::*;

use crate::{db::iden, error::CoreError};

#[derive(DeriveMigrationName)]
pub struct Migration;

async fn node_table_up<'a>(manage: &SchemaManager<'a>) -> Result<(), DbErr> {
    log::info!("Creating table node");
    manage
        .create_table(table_create!(iden::node::Node, {
            NodeId: integer not_null primary_key auto_increment,
            NodeIden: text not_null,
            NodeType: text not_null,
        }))
        .await?;
    Ok(())
}

async fn node_table_down<'a>(manage: &SchemaManager<'a>) -> Result<(), DbErr> {
    log::error!("Dropping table node");
    manage
        .drop_table(
            Table::drop()
                .table(iden::node::Node::Table)
                .if_exists()
                .to_owned(),
        )
        .await?;
    Ok(())
}

async fn user_table_up<'a>(manage: &SchemaManager<'a>) -> Result<(), DbErr> {
    log::info!("Creating table user");
    manage
        .create_table(table_create!(iden::user::User, {
            NodeId: integer not_null primary_key,
            UserIden: text not_null,
            UserName: text not_null,
            UserEmail: text not_null,
            UserCreationTime: integer not_null,
            UserCreationOrder: integer not_null auto_increment,
            UserLastLoginTime: text not_null,
            UserAvatar: text not_null,
            UserDescription: text,
            UserPassword: text not_null,
            UserBio: text,
            UserProfileShow: integer,
        }))
        .await?;
    Ok(())
}

async fn user_table_down<'a>(manage: &SchemaManager<'a>) -> Result<(), DbErr> {
    log::error!("Dropping table user");
    manage
        .drop_table(
            Table::drop()
                .table(iden::user::User::Table)
                .if_exists()
                .to_owned(),
        )
        .await?;
    Ok(())
}

#[async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manage: &SchemaManager) -> Result<(), DbErr> {
        node_table_up(manage).await?;
        user_table_up(manage).await?;
        Ok(())
    }

    async fn down(&self, manage: &SchemaManager) -> Result<(), DbErr> {
        user_table_down(manage).await?;
        node_table_down(manage).await?;
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
    if up.contains(&"all") {
        let _ = Migrator::up(&db, None).await;
    } else {
        let manager = SchemaManager::new(&db);
        if up.contains(&"node") {
            let _ = node_table_up(&manager).await;
        }
        if up.contains(&"user") {
            let _ = user_table_up(&manager).await;
        }
    }
    if down.contains(&"all") {
        let _ = Migrator::down(&db, None).await;
    } else {
        let manager = SchemaManager::new(&db);
        if down.contains(&"node") {
            let _ = node_table_down(&manager).await;
        }
        if down.contains(&"user") {
            let _ = user_table_down(&manager).await;
        }
    }
    log::info!("Database migrated");
    Ok(())
}
