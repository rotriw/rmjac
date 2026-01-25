    use std::collections::HashMap;

use async_trait::async_trait;
use log::LevelFilter;
use macro_db_init::{table_create, table_create_with};
use sea_orm::{self, ConnectOptions, Database};
use sea_orm_migration::prelude::*;

use crate::graph::edge::EdgeRaw;
use crate::graph::edge::perm_manage::PermManageEdgeRaw;
use crate::graph::edge::perm_system::PermSystemEdgeRaw;
use crate::graph::node::iden::{IdenNodePrivateRaw, IdenNodePublicRaw, IdenNodeRaw};
use crate::{
    db::iden,
    error::CoreError,
    graph::node::{
        NodeRaw,
        pages::{PagesNodePrivateRaw, PagesNodePublicRaw, PagesNodeRaw},
        perm_group::{PermGroupNodePrivateRaw, PermGroupNodePublicRaw, PermGroupNodeRaw},
        user::{UserNodePrivateRaw, UserNodePublicRaw, UserNodeRaw},
    },
};

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
        table_create_with!(iden::node::problem_statement::ProblemStatement, {
            NodeId: big_integer not_null primary_key,
            Iden: text not_null,
            Source: text not_null,
            Content: json not_null,
            CreationTime: date_time not_null,
            UpdateTime: date_time not_null,
            PageSource: text,
            PageRendered: text,
            ProblemDifficulty: integer,
        })
        .col(
            ColumnDef::new(iden::node::problem_statement::ProblemStatement::SampleGroupIn)
                .array(ColumnType::Text),
        )
        .col(
            ColumnDef::new(iden::node::problem_statement::ProblemStatement::SampleGroupOut)
                .array(ColumnType::Text),
        )
        .col(
            ColumnDef::new(iden::node::problem_statement::ProblemStatement::ShowOrder)
                .array(ColumnType::Text),
        )
        .to_owned(),
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
        "node_record".to_string(),
        table_create!(iden::node::record::Record, {
            RecordOrder: big_integer not_null auto_increment,
            NodeId: big_integer not_null primary_key,
            RecordTime: date_time not_null,
            RecordUpdateTime: date_time not_null,
            RecordStatus: big_integer not_null,
            RecordScore: big_integer not_null,
            RecordPlatform: text not_null,
            RecordUrl: text,
            StatementId: big_integer not_null,
            RecordMessage: text,
            Code: text,
            CodeLanguage: text not_null,
            PublicStatus: boolean not_null,
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
            Weight: big_integer not_null,
        }),
    );
    tables.insert(
        "node_training".to_string(),
        table_create!(iden::node::training::Training, {
            NodeId: big_integer not_null primary_key,
            Name: text not_null,
            Iden: text not_null,
            DescriptionPublic: text not_null,
            DescriptionPrivate: text not_null,
            StartTime: date_time not_null,
            EndTime: date_time not_null,
            TrainingType: text not_null,
        }),
    );
    tables.insert(
        "node_training_problem".to_string(),
        table_create!(iden::node::training_problem::TrainingProblem, {
            NodeId: big_integer not_null primary_key,
            Description: text not_null,
        }),
    );
    tables.insert(
        "node_user_remote_account".to_string(),
        table_create!(iden::node::user_remote::Vjudge, {
            NodeId: big_integer not_null primary_key,
            UserIden: text not_null,
            Platform: text not_null,
            VerifiedCode: text not_null,
            Verified: boolean not_null,
            Auth: text,
            UseMode: integer not_null,
            CreationTime: date_time not_null,
            UpdatedAt: date_time not_null,
        }),
    );
    tables.insert(
        "node_testcase_subtask".to_string(),
        table_create!(iden::node::testcase_subtask::TestcaseSubtask, {
            NodeId: big_integer not_null primary_key,
            SubtaskId: integer not_null,
            TimeLimit: big_integer not_null,
            MemoryLimit: big_integer not_null,
            SubtaskCalcMethod: integer not_null,
            SubtaskCalcFunction: text,
            IsRoot: boolean not_null,
        }),
    );
    tables.insert(
        "node_testcase".to_string(),
        table_create!(iden::node::testcase::Testcase, {
            NodeId: big_integer not_null primary_key,
            TimeLimit: big_integer not_null,
            MemoryLimit: big_integer not_null,
            InFile: big_integer not_null,
            OutFile: big_integer not_null,
            IoMethod: text not_null,
            DiffMethod: text not_null,
            TestcaseName: text not_null,
        }),
    );
    tables.insert(
        "node_vjudge_task".to_string(),
        table_create!(iden::node::vjudge_task::VjudgeTask, {
            NodeId: big_integer not_null primary_key,
            Status: text not_null,
            Log: text not_null,
            CreatedAt: date_time not_null,
            UpdatedAt: date_time not_null,
        }),
    );
    tables.insert(
        "node_submit_node".to_string(),
        table_create!(iden::node::submit_info::SubmitInfo, {
            NodeId: big_integer not_null primary_key,
            OptionData: text not_null,
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
        "edge_perm_problem".to_string(),
        table_create!(iden::edge::perm_problem::PermProblem, {
            EdgeId: big_integer not_null primary_key,
            UNodeId: big_integer not_null,
            VNodeId: big_integer not_null,
            Perm: big_integer not_null,
        }),
    );
    tables.insert(
        "edge_perm_pages".to_string(),
        table_create!(iden::edge::perm_pages::PermPages, {
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
            Weight: big_integer not_null,

        }),
    );
    tables.insert(
        "edge_training_problem".to_string(),
        table_create!(iden::edge::training_problem::TrainingProblem, {
            EdgeId: big_integer not_null primary_key,
            UNodeId: big_integer not_null,
            VNodeId: big_integer not_null,
            Order: big_integer not_null,
            ProblemType: text not_null,
        }),
    );
    tables.insert(
        "edge_record".to_string(),
        table_create!(iden::edge::record::Record, {
            EdgeId: big_integer not_null primary_key,
            UNodeId: big_integer not_null,
            VNodeId: big_integer not_null,
            RecordNodeId: big_integer not_null,
            RecordStatus: big_integer not_null,
            CodeLength: big_integer not_null,
            Score: big_integer not_null,
            SubmitTime: date_time not_null,
            Platform: text,
        }),
    );
    tables.insert(
        "edge_misc".to_string(),
        table_create!(iden::edge::misc::Misc, {
            EdgeId: big_integer not_null primary_key,
            UNodeId: big_integer not_null,
            VNodeId: big_integer not_null,
            MiscType: text not_null,
        }),
    );
    tables.insert(
        "edge_perm_system".to_string(),
        table_create!(iden::edge::perm_system::PermSystem, {
            EdgeId: big_integer not_null primary_key,
            UNodeId: big_integer not_null,
            VNodeId: big_integer not_null,
            Perm: big_integer not_null,
        }),
    );
    tables.insert(
        "edge_testcase".to_string(),
        table_create!(iden::edge::testcase::Testcase, {
            EdgeId: big_integer not_null primary_key,
            UNodeId: big_integer not_null,
            VNodeId: big_integer not_null,
            Order: big_integer not_null,
        }),
    );
    tables.insert(
        "edge_judge".to_string(),
        table_create!(iden::edge::judge::Judge, {
            EdgeId: big_integer not_null primary_key,
            UNodeId: big_integer not_null,
            VNodeId: big_integer not_null,
            Status: text not_null,
            Score: big_integer not_null,
            Time: big_integer not_null,
            Memory: big_integer not_null,
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
        "edge_perm_view".to_string(),
        table_create!(iden::edge::perm_view::PermView, {
            EdgeId: big_integer not_null primary_key,
            UNodeId: big_integer not_null,
            VNodeId: big_integer not_null,
            Perm: big_integer not_null,
        }),
    );
    tables.insert(
        "edge_user_remote".to_string(),
        table_create!(iden::edge::user_remote::UserRemote, {
            EdgeId: big_integer not_null primary_key,
            UNodeId: big_integer not_null,
            VNodeId: big_integer not_null,
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
        "node_submit_info".to_string(),
        Table::drop()
            .table(iden::node::submit_info::SubmitInfo::Table)
            .if_exists()
            .to_owned(),
    );
    tables.insert(
        "node_training".to_string(),
        Table::drop()
            .table(iden::node::training::Training::Table)
            .if_exists()
            .to_owned(),
    );
    tables.insert(
        "node_record".to_string(),
        Table::drop()
            .table(iden::node::record::Record::Table)
            .if_exists()
            .to_owned(),
    );
    tables.insert(
        "node_training_problem".to_string(),
        Table::drop()
            .table(iden::node::training_problem::TrainingProblem::Table)
            .if_exists()
            .to_owned(),
    );
    tables.insert(
        "node_user_remote_account".to_string(),
        Table::drop()
            .table(iden::node::user_remote::Vjudge::Table)
            .if_exists()
            .to_owned(),
    );
    tables.insert(
        "node_testcase_subtask".to_string(),
        Table::drop()
            .table(iden::node::testcase_subtask::TestcaseSubtask::Table)
            .if_exists()
            .to_owned(),
    );
    tables.insert(
        "node_testcase".to_string(),
        Table::drop()
            .table(iden::node::testcase::Testcase::Table)
            .if_exists()
            .to_owned(),
    );
    tables.insert(
        "node_vjudge_task".to_string(),
        Table::drop()
            .table(iden::node::vjudge_task::VjudgeTask::Table)
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
        "edge_perm_problem".to_string(),
        Table::drop()
            .table(iden::edge::perm_problem::PermProblem::Table)
            .if_exists()
            .to_owned(),
    );
    tables.insert(
        "edge_perm_pages".to_string(),
        Table::drop()
            .table(iden::edge::perm_pages::PermPages::Table)
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
    tables.insert(
        "edge_training_problem".to_string(),
        Table::drop()
            .table(iden::edge::training_problem::TrainingProblem::Table)
            .if_exists()
            .to_owned(),
    );
    tables.insert(
        "edge_record".to_string(),
        Table::drop()
            .table(iden::edge::record::Record::Table)
            .if_exists()
            .to_owned(),
    );
    tables.insert(
        "edge_misc".to_string(),
        Table::drop()
            .table(iden::edge::misc::Misc::Table)
            .if_exists()
            .to_owned(),
    );
    tables.insert(
        "edge_perm_system".to_string(),
        Table::drop()
            .table(iden::edge::perm_system::PermSystem::Table)
            .if_exists()
            .to_owned(),
    );
    tables.insert(
        "edge_testcase".to_string(),
        Table::drop()
            .table(iden::edge::testcase::Testcase::Table)
            .if_exists()
            .to_owned(),
    );
    tables.insert(
        "edge_judge".to_string(),
        Table::drop()
            .table(iden::edge::judge::Judge::Table)
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
        "edge_perm_view".to_string(),
        Table::drop()
            .table(iden::edge::perm_view::PermView::Table)
            .if_exists()
            .to_owned(),
    );
    tables.insert(
        "edge_user_remote".to_string(),
        Table::drop()
            .table(iden::edge::user_remote::UserRemote::Table)
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
            return Err(CoreError::DbError(DbErr::Custom(
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
    let mut default_system = vec![];
    let mut system_id = 0;
    if up.contains(&"all") || up.contains(&"node_system") {
        log::info!("Creating default system");
        let system = PagesNodeRaw {
            iden: "system".to_string(),
            public: PagesNodePublicRaw {},
            private: PagesNodePrivateRaw {
                name: "system".to_string(),
            },
        }
        .save(&db)
        .await?;
        default_system.push(system.node_id);
        system_id = system.node_id;
    } else {
        log::warn!("Skipping default system creation, This may lead to unexpected behavior.");
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
    } else {
        log::warn!("Skipping default perm group creation, This may lead to unexpected behavior.");
    }
    if up.contains(&"all")
        || (up.contains(&"node_perm_group")
            && up.contains(&"edge_perm_pages")
            && up.contains(&"node_pages"))
    {
        log::info!("guest user -> default system");
        use crate::service::perm::provider::System;
        PermSystemEdgeRaw {
            u: guest_user_id,
            v: system_id,
            perms: System::ViewSite + System::Register,
        }
        .save(&db)
        .await?;
    } else {
        log::warn!(
            "Skipping default perm pages edge creation, This may lead to unexpected behavior."
        );
    }
    if up.contains(&"all") {
        log::info!("Create default problem_source");
        // desperate
        // ProblemSourceNodeRaw {
        //     public: ProblemSourceNodePublicRaw {
        //         iden: "rmj".to_string(),
        //         name: "Rmj.ac".to_string(),
        //     },
        //     private: ProblemSourceNodePrivateRaw {},
        // }
        // .save(&db)
        // .await?;
        // ProblemSourceNodeRaw {
        //     public: ProblemSourceNodePublicRaw {
        //         iden: "LG".to_string(),
        //         name: "洛谷".to_string(),
        //     },
        //     private: ProblemSourceNodePrivateRaw {},
        // }
        // .save(&db)
        // .await?;
        log::info!("Create default iden super node");
        IdenNodeRaw {
            public: IdenNodePublicRaw {
                iden: "".to_string(),
                weight: -191919,
            },
            private: IdenNodePrivateRaw {},
        }
        .save(&db)
        .await?;
    }
    log::info!("Database migrated");
    Ok(())
}
