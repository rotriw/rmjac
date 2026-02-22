use redis::TypedCommands;
use sea_orm::DatabaseConnection;
use tokio::io::split;
use crate::action::default::MiscType;
use crate::error::CoreError;
use crate::Result;
use crate::model::event::{Event, EventParent};
use crate::service::perm::View;
use crate::service::save::{ManageService, SaveService, Saved};
use crate::utils::get_redis_connection;

pub async fn create_event(e: Event, db: &DatabaseConnection) -> Result<Saved<Event>> {
    let event = e.save().await?;
    create_event_total(&event, &e.iden_list, e.owned_by, db).await?;
    Ok(event)
}

pub async fn update_event_content(old: &Saved<Event>, new: &Event) -> Result<Saved<Event>> {
    let event = old.modify_all(new.clone()).await?;
    Ok(event)
}

pub async fn create_event_total<T>(e: &Saved<T>, iden_list: &Vec<String>, parent: EventParent, db: &DatabaseConnection) -> Result<()> {
    let parent_id = match parent {
        EventParent::String(owned_by) => {
            get_event_with_id(&owned_by).await?
        },
        EventParent::ID(owned_by) => {
            owned_by
        }
    };
    log::debug!("Creating event total with parent_id: {}, iden_list: {:?}", parent_id, iden_list);
    MiscType::Event.add(db, parent_id, e.id).await?;
    let mut redis = get_redis_connection();
    for i in iden_list {
        if check_for_iden(parent_id, i).await? {
            log::info!("Event iden already exists: {}, parent_id: {}", i, parent_id);
            continue;
        }
        redis.set(format!("event:{parent_id}:{i}"), e.id)?;
    }
    e.set_public_view(db).await?;
    e.set_guest_view(db).await?;
    Ok(())
}

#[derive(PartialOrd, PartialEq, Debug, Clone, Copy)]
enum NowV {
    Number,
    Alpha,
    Rand,
}

impl From<char> for NowV {
    fn from(value: char) -> Self {
        if value.is_ascii_digit() {
            NowV::Number
        } else if value.is_ascii_alphabetic() {
            NowV::Alpha
        } else {
            NowV::Rand
        }
    }
}


pub fn split_iden(iden: &str, force: bool) -> Vec<&str> {
    if iden.contains(".") {
        let mut res = vec![];
        for i in iden.split(".") {
            res = [res, split_iden(i, true)].concat();
        }
        res
    } else {
        let pre_iden = iden.split("/").collect::<Vec<&str>>();
        if force {
            pre_iden
        } else {
            let mut res = vec![];
            if pre_iden.len() == 1 {
                let str = pre_iden[0];
                let mut la_p = 0;
                let mut now_v = NowV::Rand;
                for (i, char) in str.char_indices() {
                    if i == 0 {
                        now_v = char.into();
                    } else {
                        let new: NowV = char.into();
                        if new != now_v {
                            res.push(&str[la_p..i]);
                            la_p = i;
                            now_v = new;
                        }
                    }
                }
                res.push(&str[la_p..]);
            } else {
                for i in pre_iden {
                    res = [res, split_iden(i, false)].concat();
                }
            }
            res
        }
    }
}
pub async fn get_event_with_id(iden: &str) -> Result<i64> {
    log::debug!("Getting event with iden: {}", iden);
    let iden = iden.to_lowercase();
    let iden_list = split_iden(&iden, false);
    log::debug!("Split iden: {:?} from {}", iden_list, iden);
    let mut now_id = 0;
    let mut redis = get_redis_connection();
    let mut now_query = String::new();
    for i in iden_list {
        now_query += i;
        let nc = format!("event:{now_id}:{now_query}");
        if redis.exists(&nc)? {
            now_id = redis.get(&nc)?.unwrap_or("-1".to_string()).parse::<i64>()?;
            now_query = "".to_string();
        }
        if now_id == -1 {
            return Err(CoreError::StringError(format!("The event have: {iden}")));
        }
    }
    if !now_query.is_empty() {
        return Err(CoreError::NotFound(format!("Not found specifc by event: {iden}")));
    }
    Ok(now_id)
}

pub async fn check_for_iden(p: i64, iden: &str) -> Result<bool> {
    let mut redis = get_redis_connection();
    let exist = redis.exists(format!("event:{p}:{iden}"))?;
    Ok(exist)
}