use std::collections::HashMap;

use async_trait::async_trait;
use log::LevelFilter;
use macro_db_init::table_create;
use sea_orm::{ConnectOptions, Database};
use sea_orm_migration::prelude::*;

use crate::graph::edge::perm_view::ViewPermRaw;
use crate::{
    db::iden,
    error::CoreError,
    graph::{
        edge::{
            perm_view::{PermViewEdgeRaw, ViewPerm},
            EdgeRaw,
        },
        node::{
            pages::{PagesNodePrivateRaw, PagesNodePublicRaw, PagesNodeRaw},
            perm_group::{PermGroupNodePrivateRaw, PermGroupNodePublicRaw, PermGroupNodeRaw},
            user::{UserNodePrivateRaw, UserNodePublicRaw, UserNodeRaw},
            NodeRaw,
        },
    },
};
use crate::graph::node::problem_source::{ProblemSourceNodePrivateRaw, ProblemSourceNodePublicRaw, ProblemSourceNodeRaw};

#[derive(DeriveMigrationName)]
pub struct Migration;

fn get_tables() -> HashMap<String, TableCreateStatement> {
    let mut tables = HashMap::new();
    tables.insert(
        "node".to_string(),
        table_create!(iden::node::node::Node, {
            NodeId: big_integer not_null primary_key auto_increment,
            NodeType: text not_null,
        }),
    );
    tables.insert(
        "node_user".to_string(),
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
        "node_token".to_string(),
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
        "node_problem_statement".to_string(),
        table_create!(iden::node::problem_statement::ProblemStatement, {
            NodeId: big_integer not_null primary_key,
            Iden: text not_null,
            Source: text not_null,
            Content: json not_null,
            CreationTime: date_time not_null,
            UpdateTime: date_time not_null,
        }),
    );
    tables.insert(
        "node_problem_source".to_string(),
        table_create!(iden::node::problem_source::ProblemSource, {
            NodeId: big_integer not_null primary_key,
            Name: text not_null,
            Iden: text not_null,
        }),
    );
    tables.insert(
        "node_pages".to_string(),
        table_create!(iden::node::pages::Pages, {
            NodeId: big_integer not_null primary_key,
            Iden: text not_null,
        }),
    );
    tables.insert(
        "node_perm_group".to_string(),
        table_create!(iden::node::perm_group::PermGroup, {
            NodeId: big_integer not_null primary_key,
            Iden: text not_null,
        }),
    );
    tables.insert(
        "node_problem".to_string(),
        table_create!(iden::node::problem::Problem, {
            NodeId: big_integer not_null primary_key,
            Name: text not_null,
            ContentPublic: text not_null,
            ContentPrivate: text not_null,
            CreationTime: date_time not_null,
            CreationOrder: big_integer not_null auto_increment,
        }),
    );
    tables.insert(
        "node_problem_limit".to_string(),
        table_create!(iden::node::problem_limit::ProblemLimit, {
            NodeId: big_integer not_null primary_key,
            TimeLimit: big_integer not_null,
            MemoryLimit: big_integer not_null,
        }),
    );
    tables.insert(
        "node_problem_tag".to_string(),
        table_create!(iden::node::problem_tag::ProblemTag, {
            NodeId: big_integer not_null primary_key,
            TagName: text not_null,
            TagDescription: text not_null,
        }),
    );
    tables.insert(
        "node_iden".to_string(),
        table_create!(iden::node::iden::Iden, {
            NodeId: big_integer not_null primary_key,
            Iden: text not_null,
        }),
    );
    tables.insert(
        "edge".to_string(),
        table_create!(iden::edge::edge::Edge, {
            EdgeId: big_integer not_null primary_key auto_increment,
            EdgeType: text not_null,
        }),
    );
    tables.insert(
        "edge_perm_view".to_string(),
        table_create!(iden::edge::perm_view::PermView, {
            EdgeId: big_integer not_null primary_key,
            UNodeId: big_integer not_null,
            VNodeId: big_integer not_null,
            Perm: big_integer not_null,
        }),
    );
    tables.insert(
        "edge_perm_manage".to_string(),
        table_create!(iden::edge::perm_manage::PermManage, {
            EdgeId: big_integer not_null primary_key,
            UNodeId: big_integer not_null,
            VNodeId: big_integer not_null,
            Perm: big_integer not_null,
        }),
    );
    tables.insert(
        "edge_problem_statement".to_string(),
        table_create!(iden::edge::problem_statement::ProblemStatement, {
            EdgeId: big_integer not_null primary_key,
            UNodeId: big_integer not_null,
            VNodeId: big_integer not_null,
            CopyrightRisk: big_integer not_null,
        }),
    );
    tables.insert(
        "edge_problem_limit".to_string(),
        table_create!(iden::edge::problem_limit::ProblemLimit, {
            EdgeId: big_integer not_null primary_key,
            UNodeId: big_integer not_null,
            VNodeId: big_integer not_null,
        }),
    );
    tables.insert(
        "edge_problem_tag".to_string(),
        table_create!(iden::edge::problem_tag::ProblemTag, {
            EdgeId: big_integer not_null primary_key,
            UNodeId: big_integer not_null,
            VNodeId: big_integer not_null,
        }),
    );
    tables.insert(
        "edge_iden".to_string(),
        table_create!(iden::edge::iden::Iden, {
            EdgeId: big_integer not_null primary_key,
            UNodeId: big_integer not_null,
            VNodeId: big_integer not_null,
            Iden: text not_null,
        }),
    );
    tables
}

fn get_drop_tables() -> HashMap<String, TableDropStatement> {
    let mut tables = HashMap::new();
    tables.insert(
        "node".to_string(),
        Table::drop()
            .table(iden::node::node::Node::Table)
            .if_exists()
            .to_owned(),
    );
    tables.insert(
        "node_user".to_string(),
        Table::drop()
            .table(iden::node::user::User::Table)
            .if_exists()
            .to_owned(),
    );
    tables.insert(
        "node_token".to_string(),
        Table::drop()
            .table(iden::node::token::Token::Table)
            .if_exists()
            .to_owned(),
    );
    tables.insert(
        "node_problem".to_string(),
        Table::drop()
            .table(iden::node::problem::Problem::Table)
            .if_exists()
            .to_owned(),
    );
    tables.insert(
        "node_problem_statement".to_string(),
        Table::drop()
            .table(iden::node::problem_statement::ProblemStatement::Table)
            .if_exists()
            .to_owned(),
    );
    tables.insert(
        "node_pages".to_string(),
        Table::drop()
            .table(iden::node::pages::Pages::Table)
            .if_exists()
            .to_owned(),
    );
    tables.insert(
        "node_perm_group".to_string(),
        Table::drop()
            .table(iden::node::perm_group::PermGroup::Table)
            .if_exists()
            .to_owned(),
    );
    tables.insert(
        "node_problem_limit".to_string(),
        Table::drop()
            .table(iden::node::problem_limit::ProblemLimit::Table)
            .if_exists()
            .to_owned(),
    );
    tables.insert(
        "node_problem_tag".to_string(),
        Table::drop()
            .table(iden::node::problem_tag::ProblemTag::Table)
            .if_exists()
            .to_owned(),
    );
    tables.insert(
        "node_problem_source".to_string(),
        Table::drop()
            .table(iden::node::problem_source::ProblemSource::Table)
            .if_exists()
            .to_owned(),
    );
    tables.insert(
        "node_iden".to_string(),
        Table::drop()
            .table(iden::node::iden::Iden::Table)
            .if_exists()
            .to_owned(),
    );
    tables.insert(
        "edge".to_string(),
        Table::drop()
            .table(iden::edge::edge::Edge::Table)
            .if_exists()
            .to_owned(),
    );
    tables.insert(
        "edge_perm_view".to_string(),
        Table::drop()
            .table(iden::edge::perm_view::PermView::Table)
            .if_exists()
            .to_owned(),
    );
    tables.insert(
        "edge_perm_manage".to_string(),
        Table::drop()
            .table(iden::edge::perm_manage::PermManage::Table)
            .if_exists()
            .to_owned(),
    );
    tables.insert(
        "edge_problem_statement".to_string(),
        Table::drop()
            .table(iden::edge::problem_statement::ProblemStatement::Table)
            .if_exists()
            .to_owned(),
    );
    tables.insert(
        "edge_problem_limit".to_string(),
        Table::drop()
            .table(iden::edge::problem_limit::ProblemLimit::Table)
            .if_exists()
            .to_owned(),
    );
    tables.insert(
        "edge_problem_tag".to_string(),
        Table::drop()
            .table(iden::edge::problem_tag::ProblemTag::Table)
            .if_exists()
            .to_owned(),
    );
    tables.insert(
        "edge_iden".to_string(),
        Table::drop()
            .table(iden::edge::iden::Iden::Table)
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
        .max_connections(10)
        .sqlx_logging_level(LevelFilter::Trace)
        .to_owned();
    log::info!("Database Update: {}", up.join(", "));
    log::info!("Database Drop: {}", down.join(", "));
    log::info!("Database connecting...");
    let db = Database::connect(connection_options).await.unwrap();
    log::info!("Database connected");
    if down.contains(&"all") {
        log::error!("Dropping all tables, this will delete all data in the database!");
        if mode != "dev" {
            log::error!("Dropping all is only available in development mode!(use --mode dev to confirm this action)");
            return Err(CoreError::DbError(sea_orm::error::DbErr::Custom(
                "Cannot drop all tables in non-development mode".to_string(),
            )));
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
    let mut default_pages = vec![];
    if up.contains(&"all") || up.contains(&"node_pages") {
        log::info!("Creating default pages");
        log::info!("Creating home page");
        let home_page = PagesNodeRaw {
            iden: "home".to_string(),
            public: PagesNodePublicRaw {},
            private: PagesNodePrivateRaw {
                name: "home".to_string(),
            },
        }
        .save(&db)
        .await?;
        log::info!("Creating about page");
        let about_page = PagesNodeRaw {
            iden: "about".to_string(),
            public: PagesNodePublicRaw {},
            private: PagesNodePrivateRaw {
                name: "about".to_string(),
            },
        }
        .save(&db)
        .await?;
        default_pages.push(home_page.node_id);
        default_pages.push(about_page.node_id);
    } else {
        log::warn!("Skipping default pages creation, This may lead to unexpected behavior.");
    }
    if up.contains(&"all") || up.contains(&"node_perm_group") {
        log::info!("Creating default perm group");
        let default_strategy = PermGroupNodeRaw {
            iden: "default".to_string(),
            service: "default".to_string(),
            public: PermGroupNodePublicRaw {},
            private: PermGroupNodePrivateRaw {
                name: "default strategy".to_string(),
            },
        }
        .save(&db)
        .await?;
        log::info!("Perm group -> default pages");
        for i in default_pages.clone() {
            PermViewEdgeRaw {
                u: default_strategy.node_id,
                v: i,
                perms: ViewPermRaw::Perms(vec![ViewPerm::ViewPublic, ViewPerm::ReadProblem]),
            }
            .save(&db)
            .await?;
        }
    } else {
        log::warn!("Skipping default perm group creation, This may lead to unexpected behavior.");
    }
    let mut guest_user_id = 0;
    if up.contains(&"all") || up.contains(&"node_user") {
        log::info!("Creating default user");
        let guest_user = UserNodeRaw {
            public: UserNodePublicRaw {
                name: "Guest".to_string(),
                email: "".to_string(),
                iden: "guest".to_string(),
                creation_time: chrono::Utc::now().naive_utc(),
                last_login_time: chrono::Utc::now().naive_utc(),
                avatar: "".to_string(),
            },
            private: UserNodePrivateRaw {
                password: "".to_string(),
            },
        }
        .save(&db)
        .await?;
        guest_user_id = guest_user.node_id;
    } else {
        log::warn!("Skipping default user creation, This may lead to unexpected behavior.");
    }
    if up.contains(&"all")
        || (up.contains(&"node_perm_group")
            && up.contains(&"edge_perm_view")
            && up.contains(&"node_pages"))
    {
        log::info!("default user -> default pages");
        for i in default_pages {
            PermViewEdgeRaw {
                u: guest_user_id,
                v: i,
                perms: ViewPermRaw::Perms(vec![ViewPerm::ViewPublic, ViewPerm::ReadProblem]),
            }
            .save(&db)
            .await?;
        }
    } else {
        log::warn!(
            "Skipping default perm view edge creation, This may lead to unexpected behavior."
        );
    }
    if up.contains(&"all") {
        log::info!("Create default problem_source");
        ProblemSourceNodeRaw {
            public: ProblemSourceNodePublicRaw {
                iden: "rmj".to_string(),
                name: "Rmj.ac".to_string(),
            },
            private: ProblemSourceNodePrivateRaw {}
        }.save(&db).await?;
        ProblemSourceNodeRaw {
            public: ProblemSourceNodePublicRaw {
                iden: "LG".to_string(),
                name: "洛谷".to_string(),
            },
            private: ProblemSourceNodePrivateRaw {}
        }.save(&db).await?;
    }
    log::info!("Database migrated");
    Ok(())
}
