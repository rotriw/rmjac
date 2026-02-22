use sea_orm::DatabaseConnection;

use crate::Result;
use crate::model::event::Event;
use crate::service::event::{check_for_iden, create_event, update_event_content};
use crate::service::save::{ManageService, Saved};
use crate::service::{edge::*, event::get_event_with_id};
use crate::service::search::AddToSearch;

// auto update remotejudge event.
pub async fn update_remotejudge_event(platform: &str, db: &DatabaseConnection) -> Result<()> {
    let contest = get_contests(platform).await?;
    log::info!("RemoteJudge contest data get successfully. platform: {platform} (raw data will show in debug)");
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