use sea_orm::DatabaseConnection;

use crate::Result;
use crate::model::event::Event;
use crate::model::judge::JudgeResult;
use crate::model::record::{DetailTestcase, Record};
use crate::service::create::CreateWithDB;
use crate::service::event::{check_for_iden, create_event, update_event_content};
use crate::service::judge::SetJudgeResult;
use crate::service::perm::View;
use crate::service::record::ConnectOption;
use crate::service::save::{IdInfo, ManageService, SaveService, Saved};
use crate::service::search::AddToSearch;
use crate::service::{edge::*, event::get_event_with_id};

// auto update remotejudge event.
pub async fn update_remotejudge_event(platform: &str, db: &DatabaseConnection) -> Result<()> {
    let contest = get_contests(platform).await?;
    log::info!(
        "RemoteJudge contest data get successfully. platform: {platform} (raw data will show in debug)"
    );
    for e in contest {
        // check exists.
        if let Ok(event) = get_event_with_id(&e.iden_list[0].to_string()).await {
            log::info!("Event already exists, updated data for {}.", e.iden_list[0]);
            // update_event_content(&Saved::get(event).await?, &e).await?;
            // continue;
        }
        let c = create_event(e, db).await?;
        c.set_can_search(&db).await?;
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
