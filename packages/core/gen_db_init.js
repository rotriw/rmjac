#!/usr/bin/env node
/**
 * 从 db/entity/edge/*.rs 自动生成:
 *   1. db/iden/edge/*.rs      — DeriveIden 枚举
 *   2. db/iden/edge/mod.rs    — pub mod 声明
 *   3. db/init.rs             — get_tables() / get_drop_tables() / Migration 等
 *
 * 用法:
 *   node gen_db_init.js            # 直接写入文件
 *   node gen_db_init.js --dry-run  # 只打印不写入
 */

const fs = require("fs");
const path = require("path");

const CORE_SRC = path.join(__dirname, "src", "db");
const ENTITY_EDGE_DIR = path.join(CORE_SRC, "entity", "edge");
const IDEN_EDGE_DIR = path.join(CORE_SRC, "iden", "edge");
const INIT_RS = path.join(CORE_SRC, "init.rs");

const dryRun = process.argv.includes("--dry-run");

// ─── Rust 类型 → sea_query 列类型映射 ──────────────────────────────────────────

const RUST_TYPE_MAP = {
  i64: "big_integer",
  i32: "integer",
  f64: "double",
  f32: "float",
  String: "string",
  bool: "boolean",
};

// 这些字段名即使是 String 类型也用 text
const TEXT_FIELD_NAMES = new Set([
  "code",
  "content",
  "language",
  "description",
  "body",
  "raw",
]);

// ─── 工具函数 ──────────────────────────────────────────────────────────────────

/** snake_case → PascalCase */
function toPascal(s) {
  return s
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

/** 解析 Option<T> 返回 { isOption, inner } */
function parseOptionType(rustType) {
  const m = rustType.match(/^Option<(.+)>$/);
  if (m) return { isOption: true, inner: m[1] };
  return { isOption: false, inner: rustType };
}

/** 根据字段信息返回 { colType, modifiers } */
function getColTypeAndMods(field) {
  const { isOption, inner } = parseOptionType(field.rustType);
  const nullable = isOption ? "null" : "not_null";

  let colType = RUST_TYPE_MAP[inner];
  if (!colType) {
    // 自定义类型 (JudgeInfo, JudgeStatus 等) → json_binary
    colType = "json_binary";
  }

  // String 类型的某些字段用 text
  if (inner === "String" && TEXT_FIELD_NAMES.has(field.name)) {
    colType = "text";
  }

  if (field.isPrimary) {
    return { colType, modifiers: "not_null primary_key auto_increment" };
  }
  return { colType, modifiers: nullable };
}

// ─── 解析 entity 文件 ─────────────────────────────────────────────────────────

function parseEntityFile(filePath) {
  const text = fs.readFileSync(filePath, "utf-8");
  const stem = path.basename(filePath, ".rs");

  // 提取 table_name
  const tableMatch = text.match(/table_name\s*=\s*"([^"]+)"/);
  if (!tableMatch) return null;
  const tableName = tableMatch[1];

  // 提取 struct Model { ... }
  const structMatch = text.match(/pub\s+struct\s+Model\s*\{([\s\S]*?)\}/);
  if (!structMatch) return null;

  const body = structMatch[1];
  const lines = body.split("\n");

  const fields = [];
  let nextIsPrimary = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.includes("primary_key")) {
      nextIsPrimary = true;
      if (!trimmed.includes("pub ")) continue;
    }

    const fieldMatch = trimmed.match(/^pub\s+(\w+)\s*:\s*(.+?)\s*,?\s*$/);
    if (fieldMatch) {
      const name = fieldMatch[1];
      const rustType = fieldMatch[2].replace(/,$/, "").trim();
      fields.push({
        name,
        rustType,
        isPrimary: nextIsPrimary,
        idenName: toPascal(name),
        ...parseOptionType(rustType),
      });
      nextIsPrimary = false;
    }
  }

  return { stem, tableName, fields };
}

// ─── 生成 iden/edge/<name>.rs ──────────────────────────────────────────────────

function genIdenFile(entity) {
  const fieldLines = entity.fields.map((f) => `    ${f.idenName},`).join("\n");
  return `use sea_orm_migration::prelude::*;

#[derive(DeriveIden)]
pub enum Enum {
    #[sea_orm(iden = "${entity.tableName}")]
    Table,
${fieldLines}
}
`;
}

// ─── 生成 iden/edge/mod.rs ─────────────────────────────────────────────────────

function genIdenMod(entities) {
  return entities.map((e) => `pub mod ${e.stem};`).join("\n") + "\n";
}

// ─── 生成 init.rs ──────────────────────────────────────────────────────────────

function genInitRs(entities) {
  // get_tables()
  const tableInserts = entities
    .map((e) => {
      const cols = e.fields
        .map((f) => {
          const { colType, modifiers } = getColTypeAndMods(f);
          return `            ${f.idenName}: ${colType} ${modifiers},`;
        })
        .join("\n");
      return `    tables.insert(
        "${e.tableName}".to_string(),
        table_create!(db::iden::edge::${e.stem}::Enum, {
${cols}
        }),
    );`;
    })
    .join("\n");

  // get_drop_tables()
  const dropInserts = entities
    .map(
      (e) => `    tables.insert(
        "${e.tableName}".to_string(),
        Table::drop()
            .table(db::iden::edge::${e.stem}::Enum::Table)
            .if_exists()
            .to_owned(),
    );`
    )
    .join("\n");

  return `use std::collections::HashMap;

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
${tableInserts}
    tables
}

fn get_drop_tables() -> HashMap<String, TableDropStatement> {
    let mut tables = HashMap::new();
${dropInserts}
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
`;
}

// ─── main ──────────────────────────────────────────────────────────────────────

function main() {
  // 1. 扫描所有 entity 文件
  const files = fs
    .readdirSync(ENTITY_EDGE_DIR)
    .filter((f) => f.endsWith(".rs") && f !== "mod.rs")
    .sort();

  const entities = [];
  for (const file of files) {
    const e = parseEntityFile(path.join(ENTITY_EDGE_DIR, file));
    if (e) {
      entities.push(e);
      console.log(
        `  ✓ ${e.stem} (table=${e.tableName}, ${e.fields.length} fields)`
      );
    } else {
      console.log(`  ✗ 跳过: ${file}`);
    }
  }

  if (!entities.length) {
    console.log("没有找到任何 entity!");
    return;
  }

  // 2. 生成 iden 文件
  fs.mkdirSync(IDEN_EDGE_DIR, { recursive: true });

  for (const e of entities) {
    const content = genIdenFile(e);
    const target = path.join(IDEN_EDGE_DIR, `${e.stem}.rs`);
    if (dryRun) {
      console.log(`\n--- iden/edge/${e.stem}.rs ---`);
      console.log(content);
    } else {
      fs.writeFileSync(target, content);
      console.log(`  → iden/edge/${e.stem}.rs`);
    }
  }

  // 3. 生成 iden/edge/mod.rs
  const modContent = genIdenMod(entities);
  if (dryRun) {
    console.log("\n--- iden/edge/mod.rs ---");
    console.log(modContent);
  } else {
    fs.writeFileSync(path.join(IDEN_EDGE_DIR, "mod.rs"), modContent);
    console.log("  → iden/edge/mod.rs");
  }

  // 4. 生成 init.rs
  const initContent = genInitRs(entities);
  if (dryRun) {
    console.log("\n--- init.rs ---");
    console.log(initContent);
  } else {
    fs.writeFileSync(INIT_RS, initContent);
    console.log("  → init.rs");
  }

  console.log("\n✅ 完毕!");
}

main();
