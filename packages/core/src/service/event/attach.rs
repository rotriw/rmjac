use crate::Result;
use crate::action::default::MiscType;
use crate::db::entity;
use crate::model::event::{Event, EventIden, EventParent};
use crate::model::problem::{Problem, ProblemBrief};
use crate::service::event::create_event_iden;
use crate::service::save::{ManageService, Saved, batch_get_raw};
use crate::service::search::AddToSearch;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, NotSet, QueryFilter, Set,
};

impl Saved<Event> {
    pub async fn set_event_problem_index(
        &self,
        p: &Saved<Problem>,
        db: &DatabaseConnection,
        iden: &str,
    ) -> Result<()> {
        entity::edge::event_problem::ActiveModel {
            edge_id: NotSet,
            event_id: Set(self.id),
            problem_id: Set(p.id),
            iden: Set(iden.to_string()),
        }
        .save(db)
        .await?;
        Ok(())
    }

    pub async fn attach_problem(
        &self,
        p: &Saved<Problem>,
        db: &DatabaseConnection,
        iden: &Vec<String>,
        sign: &str,
    ) -> Result<EventIden<Problem>> {
        self.set_event_problem_index(p, db, &iden[0]).await?;
        let ep = create_event_iden(p, iden, EventParent::ID(self.id), db, sign).await?;
        ep.set_can_search(db).await?;
        Ok(ep)
    }

    pub async fn get_problems(
        &self,
        db: &DatabaseConnection,
    ) -> Result<Vec<(Saved<Problem>, String)>> {
        let edges = entity::edge::event_problem::Entity::find()
            .filter(entity::edge::event_problem::Column::EventId.eq(self.id))
            .all(db)
            .await?;
        let mut res = vec![];
        for edge in edges {
            if let Ok(problem) = Saved::<Problem>::get(edge.problem_id).await {
                res.push((problem, edge.iden));
            }
        }
        Ok(res)
    }

    pub async fn get_next_events(&self, db: &DatabaseConnection) -> Result<Vec<Saved<Event>>> {
        let next_list = MiscType::Event.get_next_list(db, self.id).await?;
        let mut res = vec![];
        for next in next_list {
            if let Ok(value) = Saved::<Event>::get(next).await {
                res.push(value);
            }
        }
        Ok(res)
    }

    /// 带排序和过滤的 get_next_events
    /// - 按 iden_list[0] 排序
    /// - filter: 要求 iden_list[0] 或 name 包含该子串（不区分大小写）；以 "!" 开头则排除
    pub async fn get_next_events_ordered(
        &self,
        db: &DatabaseConnection,
        desc: bool,
        filter: Option<&str>,
    ) -> Result<Vec<Saved<Event>>> {
        let next_list = MiscType::Event.get_next_list(db, self.id).await?;
        let mut res = vec![];
        for next in next_list {
            if let Ok(value) = Saved::<Event>::get(next).await {
                res.push(value);
            }
        }
        // 过滤
        if let Some(f) = filter {
            let f = f.trim();
            if !f.is_empty() {
                let (exclude, keyword) = if let Some(k) = f.strip_prefix('!') {
                    (true, k.to_lowercase())
                } else {
                    (false, f.to_lowercase())
                };
                if !keyword.is_empty() {
                    res.retain(|e| {
                        let iden = e
                            .data
                            .iden_list
                            .first()
                            .map(|s| s.to_lowercase())
                            .unwrap_or_default();
                        let name = e.data.name.to_lowercase();
                        let contains = iden.contains(&keyword) || name.contains(&keyword);
                        if exclude { !contains } else { contains }
                    });
                }
            }
        }
        // 排序
        res.sort_by(|a, b| {
            let a_iden = a.data.iden_list.first().map(|s| s.as_str()).unwrap_or("");
            let b_iden = b.data.iden_list.first().map(|s| s.as_str()).unwrap_or("");
            let cmp = a_iden.cmp(b_iden);
            if desc { cmp.reverse() } else { cmp }
        });
        Ok(res)
    }

    /// 带排序、过滤的 get_next_events，并批量返回每个子事件的 problems
    /// 避免前端逐个请求 problems 造成大量 HTTP 调用
    pub async fn get_next_events_ordered_with_problems(
        &self,
        db: &DatabaseConnection,
        desc: bool,
        filter: Option<&str>,
    ) -> Result<Vec<(Saved<Event>, Vec<(Saved<Problem>, String)>)>> {
        let events = self.get_next_events_ordered(db, desc, filter).await?;
        let mut res = Vec::with_capacity(events.len());
        for event in events {
            let problems = event.get_problems(db).await.unwrap_or_default();
            res.push((event, problems));
        }
        Ok(res)
    }

    /// 高性能批量获取：返回子事件 + 精简的 ProblemBrief
    /// - 支持分页（offset/limit），无 filter 时分页，有 filter 时返回全部匹配
    /// - 一次 SQL IN 查询所有子事件的 problem edges
    /// - 一次 Redis pipeline MGET 批量获取所有 problem 数据
    /// - 返回 (事件+problems 列表, 过滤+排序后的总数)
    pub async fn get_next_events_ordered_with_problems_brief(
        &self,
        db: &DatabaseConnection,
        desc: bool,
        filter: Option<&str>,
        offset: Option<usize>,
        limit: Option<usize>,
    ) -> Result<(Vec<(Saved<Event>, Vec<(ProblemBrief, String)>)>, usize)> {
        let all_events = self.get_next_events_ordered(db, desc, filter).await?;
        let total = all_events.len();
        if all_events.is_empty() {
            return Ok((vec![], 0));
        }

        // 有 filter 时返回全部匹配，否则分页
        let has_filter = filter.map(|f| !f.trim().is_empty()).unwrap_or(false);
        let events: Vec<Saved<Event>> = if has_filter {
            all_events
        } else {
            let off = offset.unwrap_or(0);
            let lim = limit.unwrap_or(total);
            all_events.into_iter().skip(off).take(lim).collect()
        };

        if events.is_empty() {
            return Ok((vec![], total));
        }

        // 1. 一次 SQL 批量查询所有子事件的 problem edges
        let event_ids: Vec<i64> = events.iter().map(|e| e.id).collect();
        let all_edges = entity::edge::event_problem::Entity::find()
            .filter(entity::edge::event_problem::Column::EventId.is_in(event_ids.clone()))
            .all(db)
            .await?;

        // 2. 收集所有 unique problem_ids
        let all_problem_ids: Vec<i64> = all_edges.iter().map(|e| e.problem_id).collect();
        let unique_problem_ids: Vec<i64> = {
            let mut ids = all_problem_ids.clone();
            ids.sort_unstable();
            ids.dedup();
            ids
        };

        // 3. 一次 Redis pipeline 批量获取所有 problem JSON
        let raw_data = batch_get_raw(&unique_problem_ids).await?;
        let mut problem_map = std::collections::HashMap::with_capacity(raw_data.len());
        for (id, json) in raw_data {
            if let Ok(problem) = serde_json::from_str::<Problem>(&json) {
                problem_map.insert(
                    id,
                    ProblemBrief {
                        id,
                        name: problem.name,
                        sign: problem.sign,
                        platform: problem.platform,
                        difficulty: problem.difficulty,
                    },
                );
            }
        }

        // 4. 按事件分组组装结果
        let mut edge_map: std::collections::HashMap<i64, Vec<(i64, String)>> =
            std::collections::HashMap::new();
        for edge in all_edges {
            edge_map
                .entry(edge.event_id)
                .or_default()
                .push((edge.problem_id, edge.iden));
        }

        let mut res = Vec::with_capacity(events.len());
        for event in events {
            let problems = if let Some(edges) = edge_map.get(&event.id) {
                edges
                    .iter()
                    .filter_map(|(pid, iden)| {
                        problem_map
                            .get(pid)
                            .map(|brief| (brief.clone(), iden.clone()))
                    })
                    .collect()
            } else {
                vec![]
            };
            res.push((event, problems));
        }
        Ok((res, total))
    }
}
