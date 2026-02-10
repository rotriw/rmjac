use std::collections::{HashMap, HashSet};
use log::log;
use crate::workflow::Service;


const MAX_PATH: i64 = 1 << 50;

pub async fn plan_method(services: Vec<Box<dyn Service>>, input: Box<dyn crate::workflow::Status>, target: &str) -> Option<Vec<Box<dyn Service>>> {
    let mut vis = HashSet::new();
    let mut action = HashMap::new();
    let mut action_number = HashMap::new();
    let mut map_service = HashMap::new();
    let mut query_map = vec![];
    // find first step.
    let mut dis = vec![MAX_PATH; services.len()];
    use priority_queue::PriorityQueue;
    let mut q = PriorityQueue::new();
    for (idx, service) in services.into_iter().enumerate() {
        let name = service.get_info().name;
        action_number.insert(name.clone(), idx);
        if service.verify(&input).await {
            q.push(vec![name.clone()], service.get_cost() as i64);
            dis[idx] = service.get_cost() as i64;
            action.insert(name.clone(), service);
        } else {
            map_service.insert(name, service);
        }
    }
    for service in map_service.values() {
        query_map.push(service);
        log::debug!("Service available for planning: {}", service.get_info().name);
    }
    for service in action.values() {
        query_map.push(service);
        log::debug!("Service available for planning: {}", service.get_info().name);
    }
    if let Some(target_idx) = action_number.get(target) {
        if dis[*target_idx] < MAX_PATH {
            return Some(vec![action.remove(target).unwrap()]);
        }
    }

    while !q.is_empty() {
        let (path, _) = q.pop().unwrap();
        let last = path.last().unwrap();
        if vis.contains(last) {
            continue;
        }
        if last == target {
            let mut res = Vec::new();
            log::debug!("Plan going to {target}:");
            for name in path {
                log::debug!("-> {}", &name);
                if let Some(service) = action.remove(&name) {
                    res.push(service);
                } else {
                    res.push(map_service.remove(&name).unwrap());
                }
            }
            return Some(res);
        }
        vis.insert(last.clone());
        let service = if !action.contains_key(last) {
            &map_service[last]
        } else {
            &action[last]
        };
        let output_describe = service.get_export_describe();
        for next_service in &query_map {
            let require = next_service.get_import_require();
            let mut verify = true;
            for describe in output_describe.iter() {
                if !require.verify(describe).await {
                    verify = false;
                    break;
                }
            }
            if verify {
                let next_path = [path.clone(), vec![next_service.get_info().name.clone()]].concat();
                let next_cost = dis[action_number[last]] + next_service.get_cost() as i64;
                if next_cost < dis[action_number[&next_service.get_info().name]] {
                    dis[action_number[&next_service.get_info().name]] = next_cost;
                    q.push(next_path, -next_cost);
                }
                break;
            }
        }
    }
    log::debug!("No plan found for target: {}", target);
    None
}