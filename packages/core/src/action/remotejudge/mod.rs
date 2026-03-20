use crate::Result;
use crate::model::event::Event;
use crate::model::judge::{JudgeInfo, JudgeMethod, JudgeResult};
use crate::model::record::JudgeStatus::Accepted;
use crate::model::record::ShowStyle::{CFSync, RemoteJudge};
use crate::model::record::{BasicRecord, DetailTestcase, JudgeStatus, JudgeTotal, Record, ShowStyle};
use crate::model::vjudge::{Vjudge, VjudgeAuth};
use crate::service::create::CreateWithDB;
use crate::service::event::{check_for_iden, create_event, update_event_content};
use crate::service::judge::SetJudgeResult;
use crate::service::perm::View;
use crate::service::record::ConnectOption;
use crate::service::save::{IdInfo, ManageService, SaveService, Saved};
use crate::service::search::AddToSearch;
use crate::service::{edge::*, event::get_event_with_id};
use crate::utils::get_redis_connection;
use redis::TypedCommands;
use sea_orm::DatabaseConnection;

// auto update remotejudge event.
pub async fn update_remotejudge_event(platform: &str, db: &DatabaseConnection) -> Result<()> {
    let contest = get_contests(platform).await?;
    log::info!(
        "RemoteJudge contest data get successfully. platform: {platform} (raw data will show in debug)"
    );
    for e in contest {
        // check exists.
        if let Ok(id) = get_event_with_id(&e.iden_list[0].to_string()).await {
            log::info!("Event already exists, updated data for {}.", e.iden_list[0]);
            update_event_content(&Saved::get(id).await?, &e).await?;
            continue;
        }
        let c = create_event(e, db).await?;
        c.set_can_search(db).await?;
    }
    Ok(())
}

pub async fn update_remotejudge_problem(
    platform: &str,
    event: &Saved<Event>,
    db: &DatabaseConnection,
) -> Result<()> {
    let problems = get_problems_with_event(&event.data.iden_list[0], platform).await?;
    log::info!(
        "RemoteJudge problem data get successfully. platform: {platform} (raw data will show in debug)"
    );
    log::debug!("{:?}", problems);
    let owned_problems = event.get_problems(db).await?;
    let mut owned = vec![];
    for problem in owned_problems {
        owned.push(problem.0.data.name);
    }
    for (problem, detail) in problems {
        if owned.contains(&problem.name) {
            continue;
        }
        let problem = problem.save().await;
        if let Ok(problem) = problem {
            event
                .attach_problem(&problem, db, &detail.iden, &detail.sign)
                .await?;
        } else {
            log::warn!("occur error when save: {:?}", problem);
        }
    }
    log::info!("done3");
    Ok(())
}

pub async fn update_remotejudge_problem_all(
    platform: &str,
    sleep_ms: u64,
    db: &DatabaseConnection,
) -> Result<()> {
    let event = Saved::<Event>::get(get_event_with_id(platform).await?).await?;
    let event_list = event.get_next_events(db).await?;
    log::info!(
        "Platform {platform} have {} events. let us update.",
        event_list.len()
    );
    for event in event_list {
        if let Some(is_update) = event.data.event_update
            && is_update
        {
            log::debug!("event {:?} is up to date.", event);
            continue;
        }
        update_remotejudge_problem(platform, &event, db).await?;
        log::info!("done1");
        tokio::time::sleep(tokio::time::Duration::from_millis(sleep_ms)).await;
        log::info!("done2");
    }
    Ok(())
}

pub async fn update_user_record(
    record: Record,
    user_id: impl IdInfo,
    detail: JudgeResult,
    problem_id: impl IdInfo,
    db: &DatabaseConnection,
) -> Result<Saved<Record>> {
    let mut record = record;
    record.basic.problem_id = problem_id.get_id();
    record.basic.user_id = user_id.get_id();
    let record = record.create(db).await?;

    record.set_owner(user_id, db).await?;
    record.set_guest_view(db).await?;
    record.set_public_view(db).await?;
    record
        .set_judge_result(
            &detail,
            problem_id,
            db,
            ConnectOption {
                force_create_root_subtask: true,
                append_place: Some(-1),
            },
        )
        .await?;

    Ok(record)
}

// fn detect_language(code: &str) -> String {
//     use hyperpolyglot;
//     hyperpolyglot::Detection::co
// }

pub async fn update_atcoder_sync(
    db: &DatabaseConnection,
    handle: &str,
    range: Range,
    public_view: bool,
    user_id: i64,
) -> Result<()> {
    let info = VjudgeAuth::OnlyTrusted.sync_list(range, "atcoder").await?;
    let mut redis = get_redis_connection();
    for item in info {
        if let Some(id) = item.submission_id.clone()
            && redis.exists(format!("Saved:AT:{id}")).unwrap_or(false)
        {
            continue;
        }
        let problem_id = get_event_with_id(&item.iden).await;
        let problem_id = if problem_id.is_err() {
            let event = get_event_with_id(&item.contest_id.unwrap()).await;
            if let Ok(event) = event {
                let _ =
                    update_remotejudge_problem("atcoder", &Saved::get(event).await?, db).await;
                tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                get_event_with_id(&item.iden).await.unwrap_or(-1)
            } else {
                -1
            }
        } else {
            problem_id?
        };
        let language = item.language.unwrap_or("No Language Support.".to_string());
        let basic = BasicRecord {
            problem_id,
            user_id,
            language,
            judge_detail: JudgeTotal {
                is_passed: item.passed,
                status: item.status,
                detail: ShowStyle::OnlyPassed {}
            },
            judge_time: now_time!().and_utc(),
            judge_message: "none".to_string(),
        };
        let record = basic.create(db).await?;
        if public_view {
            record.set_public_view(db).await?;
            record.set_guest_view(db).await?;
        }
        record.set_owner(user_id, db).await?;
        record
            .set_judge_result(
                &JudgeResult::Result(JudgeInfo {
                    judge_method: JudgeMethod::RemoteJudge,
                    status: item.status,
                    time: item.time.unwrap_or(-1),
                    memory: item.memory.unwrap_or(-1),
                    score: if item.passed { 100.0 } else { 0.0 },
                    passed: item.passed
                }),
                problem_id,
                db,
                ConnectOption {
                    append_place: Some(-1),
                    force_create_root_subtask: true,
                },
            )
            .await?;
    redis
        .set(
            format!(
                "Saved:AT:{}",
                item.submission_id.clone().unwrap_or("unk".to_string())
            ),
            record.id,
        )?;
    }
    Ok(())
}

pub async fn update_codeforces_sync(
    db: &DatabaseConnection,
    api_key: &str,
    api_secret: &str,
    handle: &str,
    range: Range,
    public_view: bool,
    user_id: i64,
) -> Result<()> {
    let info = VjudgeAuth::Apikey {
        key: api_key.to_string(),
        secret: api_secret.to_string(),
        username: handle.to_string(),
    }
    .sync_list(range, "codeforces")
    .await?;
    log::debug!("info: {:?}", info);
    let mut redis = get_redis_connection();
    for item in info {
        if let Some(id) = item.submission_id.clone()
            && redis.exists(format!("Saved:CF:{id}")).unwrap_or(false)
        {
            continue;
        }
        let problem_id = get_event_with_id(&item.iden).await;
        let problem_id = if problem_id.is_err() {
            let event = get_event_with_id(&item.contest_id.unwrap()).await;
            if let Ok(event) = event {
                let _ =
                    update_remotejudge_problem("codeforces", &Saved::get(event).await?, db).await;
                tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                get_event_with_id(&item.iden).await.unwrap_or(-1)
            } else {
                -1
            }
        } else {
            problem_id?
        };
        if problem_id == -1 {
            continue;
        }
        log::debug!("problem id is: {problem_id}");
        let language = item.language.unwrap_or("No Language Support.".to_string());
        if let Some(code) = item.code {
            let basic = BasicRecord {
                problem_id,
                user_id,
                language,
                judge_detail: JudgeTotal {
                    is_passed: item.passed,
                    status: item.status,
                    detail: if item.detail.is_none() {
                        ShowStyle::OnlyPassed {}
                    } else {
                        ShowStyle::CFSync {
                            total_testcase: item.detail.clone().unwrap().len() as i64,
                            passed_testcase: item.detail.clone().unwrap().len() as i64,
                            time: item.time.unwrap(),
                            memory: item.memory.unwrap(),
                        }
                    },
                },
                judge_time: now_time!().and_utc(),
                judge_message: "none".to_string(),
            };
            let record = Record { basic, code }.create(db).await?;
            if public_view {
                record.set_public_view(db).await?;
                record.set_guest_view(db).await?;
            }
            record.set_owner(user_id, db).await?;
            let judge_info = item.detail.unwrap_or(vec![]);
            let mut judge_list = vec![];
            for judge in judge_info {
                judge_list.push((
                    judge.testcase_name,
                    JudgeInfo {
                        judge_method: JudgeMethod::RemoteJudge,
                        passed: judge.status == Accepted,
                        status: judge.status,
                        time: judge.time.unwrap_or(-1),
                        memory: judge.memory.unwrap_or(-1),
                        score: judge.score.unwrap_or(0f64),
                    },
                ))
            }
            record
                .set_judge_result(
                    &JudgeResult::List(judge_list),
                    problem_id,
                    db,
                    ConnectOption {
                        append_place: Some(-1),
                        force_create_root_subtask: true,
                    },
                )
                .await?;
            redis
                .set(
                    format!(
                        "Saved:CF:{}",
                        item.submission_id.clone().unwrap_or("unk".to_string())
                    ),
                    record.id,
                )?;
        }
    }
    Ok(())
}
