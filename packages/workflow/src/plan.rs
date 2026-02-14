use std::any::Any;
use std::collections::{HashMap, HashSet, VecDeque};
use async_trait::async_trait;
use log::log;
use crate::description::{WorkflowExportDescribe, WorkflowRequire};
use crate::workflow::{Service, Status, StatusDescribe, StatusRequire, TaskRequire};

fn is_require_empty(require: &Box<dyn crate::workflow::StatusRequire>) -> bool {
    if let Some(workflow_require) = require.as_any().downcast_ref::<WorkflowRequire>() {
        return workflow_require.is_empty();
    }
    false
}

fn require_keys(require: &Box<dyn StatusRequire>) -> Vec<String> {
    if let Some(workflow_require) = require.as_any().downcast_ref::<WorkflowRequire>() {
        return workflow_require.required_keys();
    }
    Vec::new()
}

fn export_keys(describe: &Box<dyn StatusDescribe>) -> Vec<String> {
    if let Some(workflow_export) = describe.as_any().downcast_ref::<WorkflowExportDescribe>() {
        return workflow_export.all_keys();
    }
    Vec::new()
}

fn keys_signature(keys: &HashSet<String>) -> String {
    let mut list: Vec<String> = keys.iter().cloned().collect();
    list.sort();
    list.join("\u{0000}")
}

/// Expand inner keys: if a key set contains `inner:X`, also add `X`.
/// This ensures that trusted exports (inner:X) can satisfy
/// plain `X` requirements, but not vice versa.
fn expand_inner_keys(keys: &mut HashSet<String>) {
    let mut additions = Vec::new();
    for key in keys.iter() {
        if let Some(stripped) = key.strip_prefix("inner:") {
            additions.push(stripped.to_string());
        }
    }
    for key in additions {
        keys.insert(key);
    }
}

fn export_keys_expanded(exports: &[String]) -> HashSet<String> {
    let mut out: HashSet<String> = exports.iter().cloned().collect();
    expand_inner_keys(&mut out);
    out
}

fn require_signature(keys: &HashSet<String>) -> String {
    let mut list: Vec<String> = keys.iter().cloned().collect();
    list.sort();
    list.join("\u{0000}")
}

struct CompositeRequire {
    base: Box<dyn StatusRequire>,
    extra_keys: Vec<String>,
}

impl CompositeRequire {
    fn new(base: Box<dyn StatusRequire>, extra_keys: Vec<String>) -> Self {
        Self { base, extra_keys }
    }
}

#[async_trait(?Send)]
impl StatusRequire for CompositeRequire {
    async fn verify(&self, o: &Box<dyn StatusDescribe>) -> bool {
        if !self.base.verify(o).await {
            return false;
        }
        for key in &self.extra_keys {
            if o.value(key).await.is_none() {
                return false;
            }
        }
        true
    }

    fn as_any(&self) -> &dyn Any {
        self
    }

    fn describe(&self) -> String {
        let base_desc = self.base.describe();
        let mut parts = Vec::new();
        if !base_desc.is_empty()
            && base_desc != "No description"
            && base_desc != "No requirements"
        {
            parts.push(base_desc);
        }
        for key in &self.extra_keys {
            parts.push(format!("Must have key '{}'", key));
        }
        if parts.is_empty() {
            "No requirements".to_string()
        } else {
            parts.join("; \n")
        }
    }
}

struct PlanMeta {
    cost: i64,
    inherit: bool,
    require_empty: bool,
    require_keys: Vec<String>,
    export_keys: HashSet<String>,
}

pub async fn plan_method<S: Status + Clone>(services: Vec<Box<dyn Service<S>>>, input: S, target: &str) -> Option<Vec<Box<dyn Service<S>>>> {
    let mut service_map: HashMap<String, Box<dyn Service<S>>> = HashMap::new();
    let mut plan_meta: HashMap<String, PlanMeta> = HashMap::new();

    for service in services {
        let name = service.get_info().name;
        let require = service.get_import_require();
        let require_empty = is_require_empty(&require);
        let require_keys = require_keys(&require);
        let mut exports = HashSet::new();
        for describe in service.get_export_describe().iter() {
            for key in export_keys(describe) {
                exports.insert(key);
            }
        }
        plan_meta.insert(
            name.clone(),
            PlanMeta {
                cost: service.get_cost() as i64,
                inherit: service.inherit_status(),
                require_empty,
                require_keys,
                export_keys: exports,
            },
        );
        service_map.insert(name, service);
    }

    if !service_map.contains_key(target) {
        log::debug!("No service found for target: {}", target);
        return None;
    }

    let mut input_keys: HashSet<String> = HashSet::new();
    for (key, _) in input.get_all_value() {
        input_keys.insert(key);
    }

    let mut dist: HashMap<String, i64> = HashMap::new();
    let mut prev: HashMap<String, (String, String)> = HashMap::new();
    let mut state_keys: HashMap<String, HashSet<String>> = HashMap::new();

    use std::cmp::Reverse;
    use std::collections::BinaryHeap;
    let mut heap: BinaryHeap<(Reverse<i64>, String)> = BinaryHeap::new();

    for (name, service) in service_map.iter() {
        if !service.verify(&input).await {
            continue;
        }
        let meta = match plan_meta.get(name) {
            Some(meta) => meta,
            None => continue,
        };
        if name == target {
            return Some(vec![service.clone()]);
        }
        let mut next_keys = if meta.inherit {
            input_keys.clone()
        } else {
            HashSet::new()
        };
        for key in &meta.export_keys {
            next_keys.insert(key.clone());
        }
        // inner:X exports also make X available
        expand_inner_keys(&mut next_keys);
        let sig = keys_signature(&next_keys);
        let next_cost = meta.cost;
        let update = match dist.get(&sig) {
            Some(existing) => next_cost < *existing,
            None => true,
        };
        if update {
            dist.insert(sig.clone(), next_cost);
            prev.insert(sig.clone(), (String::from("__start__"), name.clone()));
            state_keys.insert(sig.clone(), next_keys);
            heap.push((Reverse(next_cost), sig));
        }
    }

    while let Some((Reverse(cost), sig)) = heap.pop() {
        if dist.get(&sig).map(|v| *v != cost).unwrap_or(true) {
            continue;
        }
        let current_keys = match state_keys.get(&sig) {
            Some(keys) => keys.clone(),
            None => continue,
        };

        for (name, meta) in plan_meta.iter() {
            if meta.require_empty {
                // ok
            } else if meta.require_keys.is_empty() {
                continue;
            } else if !meta.require_keys.iter().all(|k| current_keys.contains(k)) {
                continue;
            }

            let mut next_keys = if meta.inherit {
                current_keys.clone()
            } else {
                HashSet::new()
            };
            for key in &meta.export_keys {
                next_keys.insert(key.clone());
            }
            // inner:X exports also make X available
            expand_inner_keys(&mut next_keys);
            let next_sig = keys_signature(&next_keys);
            let next_cost = cost + meta.cost;

            if name == target {
                let mut path_names: Vec<String> = Vec::new();
                let mut cursor = sig.clone();
                while let Some((prev_sig, service_name)) = prev.get(&cursor).cloned() {
                    if prev_sig == "__start__" {
                        path_names.push(service_name);
                        break;
                    }
                    path_names.push(service_name);
                    cursor = prev_sig;
                }
                path_names.reverse();
                path_names.push(name.clone());

                let mut result = Vec::new();
                for service_name in path_names {
                    if let Some(service) = service_map.remove(&service_name) {
                        result.push(service);
                    }
                }
                if result.is_empty() {
                    return None;
                }
                return Some(result);
            }

            let update = match dist.get(&next_sig) {
                Some(existing) => next_cost < *existing,
                None => true,
            };
            if update {
                dist.insert(next_sig.clone(), next_cost);
                prev.insert(next_sig.clone(), (sig.clone(), name.clone()));
                state_keys.insert(next_sig.clone(), next_keys);
                heap.push((Reverse(next_cost), next_sig));
            }
        }
    }

    log::debug!("No plan found for target: {}", target);
    None
}

pub async fn extra_start_points<S: Status + Clone>(
    services: Vec<Box<dyn Service<S>>>,
    start: &str,
    target: &str,
) -> Vec<TaskRequire> {
    if start != target {
        return extra_start_points_legacy(services, start, target).await;
    }
    extra_start_points_all_paths(services, target).await
}

async fn extra_start_points_legacy<S: Status + Clone>(
    services: Vec<Box<dyn Service<S>>>,
    start: &str,
    target: &str,
) -> Vec<TaskRequire> {
    let mut map = HashMap::new();
    for service in services.iter() {
        map.insert(service.get_info().name.clone(), service.clone());
    }
    if !map.contains_key(start) || !map.contains_key(target) {
        return vec![];
    }

    let mut export_map: HashMap<String, Vec<String>> = HashMap::new();
    let mut require_map: HashMap<String, Vec<String>> = HashMap::new();
    let mut require_empty: HashMap<String, bool> = HashMap::new();
    for service in services.iter() {
        let name = service.get_info().name.clone();
        let mut exports = Vec::new();
        for describe in service.get_export_describe().iter() {
            exports.extend(export_keys(describe));
        }
        export_map.insert(name.clone(), exports);

        let require = service.get_import_require();
        let empty = is_require_empty(&require);
        let keys = require_keys(&require);
        require_empty.insert(name.clone(), empty);
        require_map.insert(name, keys);
    }

    let mut reachable = HashSet::new();
    let mut available_keys: HashSet<String> = HashSet::new();
    let mut forward_q = VecDeque::new();
    forward_q.push_back(start.to_string());
    reachable.insert(start.to_string());

    while let Some(node) = forward_q.pop_front() {
        if let Some(exports) = export_map.get(&node) {
            for key in exports {
                available_keys.insert(key.clone());
            }
        }
        for service in services.iter() {
            let name = service.get_info().name.clone();
            if reachable.contains(&name) {
                continue;
            }
            let empty = *require_empty.get(&name).unwrap_or(&false);
            let require_keys = require_map.get(&name).cloned().unwrap_or_default();
            let satisfied = if empty {
                true
            } else if require_keys.is_empty() {
                false
            } else {
                require_keys.iter().all(|k| available_keys.contains(k))
            };
            if satisfied {
                reachable.insert(name.clone());
                forward_q.push_back(name);
            }
        }
    }

    let mut reverse_vis = HashSet::new();
    let mut route_map: HashMap<String, String> = HashMap::new();
    let mut reverse_q = VecDeque::new();
    reverse_q.push_back(target.to_string());
    reverse_vis.insert(target.to_string());
    route_map.insert(target.to_string(), target.to_string());

    while let Some(node) = reverse_q.pop_front() {
        let route = route_map.get(&node).cloned().unwrap_or_else(|| node.clone());
        let require_keys = require_map.get(&node).cloned().unwrap_or_default();
        if require_keys.is_empty() {
            continue;
        }
        for (service_name, exports) in export_map.iter() {
            if service_name == &node {
                continue;
            }
            let intersects = exports.iter().any(|k| require_keys.contains(k));
            if intersects && reverse_vis.insert(service_name.clone()) {
                route_map.insert(service_name.clone(), format!("{} > {}", service_name, route));
                reverse_q.push_back(service_name.clone());
            }
        }
    }

    let target_require_keys = require_map.get(target).cloned().unwrap_or_default();

    let mut extra = Vec::new();
    for name in reverse_vis.iter() {
        if name == start || name == target {
            continue;
        }
        if reachable.contains(name) {
            continue;
        }
        if let Some(service) = map.get(name) {
            let base_require = service.get_import_require();
            let base_keys = require_map.get(name).cloned().unwrap_or_default();

            let mut available = HashSet::new();
            for key in &base_keys {
                available.insert(key.clone());
            }
            if let Some(exports) = export_map.get(name) {
                for key in exports {
                    available.insert(key.clone());
                }
            }
            expand_inner_keys(&mut available);

            let mut changed = true;
            while changed {
                changed = false;
                for (svc_name, svc_require) in require_map.iter() {
                    let empty = *require_empty.get(svc_name).unwrap_or(&false);
                    let satisfied = if empty {
                        true
                    } else if svc_require.is_empty() {
                        false
                    } else {
                        svc_require.iter().all(|k| available.contains(k))
                    };
                    if satisfied {
                        if let Some(exports) = export_map.get(svc_name) {
                            for key in exports {
                                if available.insert(key.clone()) {
                                    changed = true;
                                }
                            }
                        }
                    }
                }
                if changed {
                    expand_inner_keys(&mut available);
                }
            }

            let mut missing: Vec<String> = target_require_keys
                .iter()
                .filter(|k| !available.contains(*k))
                .cloned()
                .collect();
            missing.retain(|k| !base_keys.contains(k));
            missing.sort();

            let require: Box<dyn StatusRequire> = if missing.is_empty() {
                base_require
            } else {
                Box::new(CompositeRequire::new(base_require, missing))
            };

            extra.push(TaskRequire {
                start_service_info: service.get_info(),
                require,
                route_describe: route_map.get(name).cloned().unwrap_or_else(|| name.clone()),
            });
        }
    }
    extra.sort_by(|a, b| a.start_service_info.name.cmp(&b.start_service_info.name));
    extra
}

async fn extra_start_points_all_paths<S: Status + Clone>(
    services: Vec<Box<dyn Service<S>>>,
    target: &str,
) -> Vec<TaskRequire> {
    let mut service_map: HashMap<String, Box<dyn Service<S>>> = HashMap::new();
    let mut require_map: HashMap<String, Vec<String>> = HashMap::new();
    let mut export_map: HashMap<String, Vec<String>> = HashMap::new();
    let mut inherit_map: HashMap<String, bool> = HashMap::new();

    for service in services.into_iter() {
        let name = service.get_info().name.clone();
        let require = service.get_import_require();
        let keys = require_keys(&require);
        let mut exports = Vec::new();
        for describe in service.get_export_describe().iter() {
            exports.extend(export_keys(describe));
        }
        require_map.insert(name.clone(), keys);
        export_map.insert(name.clone(), exports);
        inherit_map.insert(name.clone(), service.inherit_status());
        service_map.insert(name, service);
    }

    if !service_map.contains_key(target) {
        return vec![];
    }

    let mut adjacency: HashMap<String, Vec<String>> = HashMap::new();
    let names: Vec<String> = service_map.keys().cloned().collect();
    for from in &names {
        let exports = export_map.get(from).cloned().unwrap_or_default();
        let expanded = export_keys_expanded(&exports);
        let mut next_list = Vec::new();
        for to in &names {
            if from == to {
                continue;
            }
            let require_keys = require_map.get(to).cloned().unwrap_or_default();
            if require_keys.is_empty() {
                next_list.push(to.clone());
                continue;
            }
            if require_keys.iter().any(|k| expanded.contains(k)) {
                next_list.push(to.clone());
            }
        }
        adjacency.insert(from.clone(), next_list);
    }

    let mut results: Vec<TaskRequire> = Vec::new();
    let mut seen: HashSet<(String, String)> = HashSet::new();
    let max_depth = names.len().max(1);

    for start in &names {
        if start == target {
            continue;
        }
        let mut path = vec![start.clone()];
        let mut visited = HashSet::new();
        visited.insert(start.clone());
        collect_paths(
            start,
            target,
            &adjacency,
            &mut path,
            &mut visited,
            max_depth,
            &service_map,
            &require_map,
            &export_map,
            &inherit_map,
            &mut results,
            &mut seen,
        );
    }

    results.sort_by(|a, b| {
        a.start_service_info
            .name
            .cmp(&b.start_service_info.name)
            .then(a.route_describe.cmp(&b.route_describe))
    });
    results
}

fn collect_paths<S: Status + Clone>(
    current: &str,
    target: &str,
    adjacency: &HashMap<String, Vec<String>>,
    path: &mut Vec<String>,
    visited: &mut HashSet<String>,
    max_depth: usize,
    service_map: &HashMap<String, Box<dyn Service<S>>>,
    require_map: &HashMap<String, Vec<String>>,
    export_map: &HashMap<String, Vec<String>>,
    inherit_map: &HashMap<String, bool>,
    results: &mut Vec<TaskRequire>,
    seen: &mut HashSet<(String, String)>,
) {
    if path.len() > max_depth {
        return;
    }
    if current == target {
        if let Some(start_service) = service_map.get(&path[0]) {
            let required = compute_path_require(path, require_map, export_map, inherit_map);
            let mut extra_keys: Vec<String> = required.iter().cloned().collect();
            extra_keys.sort();
            let signature = require_signature(&required);
            let key = (path[0].clone(), signature);
            if !seen.insert(key) {
                return;
            }
            let base_require = start_service.get_import_require();
            let base_keys = require_map
                .get(&path[0])
                .cloned()
                .unwrap_or_default();
            extra_keys.retain(|k| !base_keys.contains(k));
            let require: Box<dyn StatusRequire> = if extra_keys.is_empty() {
                base_require
            } else {
                Box::new(CompositeRequire::new(base_require, extra_keys))
            };
            results.push(TaskRequire {
                start_service_info: start_service.get_info(),
                require,
                route_describe: path.join(" > "),
            });
        }
        return;
    }

    if let Some(nexts) = adjacency.get(current) {
        for next in nexts {
            if visited.contains(next) {
                continue;
            }
            visited.insert(next.clone());
            path.push(next.clone());
            collect_paths(
                next,
                target,
                adjacency,
                path,
                visited,
                max_depth,
                service_map,
                require_map,
                export_map,
                inherit_map,
                results,
                seen,
            );
            path.pop();
            visited.remove(next);
        }
    }
}

fn compute_path_require(
    path: &[String],
    require_map: &HashMap<String, Vec<String>>,
    export_map: &HashMap<String, Vec<String>>,
    inherit_map: &HashMap<String, bool>,
) -> HashSet<String> {
    let mut required: HashSet<String> = HashSet::new();
    let mut available: HashSet<String> = HashSet::new();

    for service_name in path {
        let require_keys = require_map.get(service_name).cloned().unwrap_or_default();
        for key in require_keys {
            if !available.contains(&key) {
                required.insert(key.clone());
                available.insert(key);
            }
        }

        let inherit = *inherit_map.get(service_name).unwrap_or(&true);
        let mut next_available = if inherit {
            available.clone()
        } else {
            HashSet::new()
        };
        if let Some(exports) = export_map.get(service_name) {
            for key in exports {
                next_available.insert(key.clone());
            }
        }
        expand_inner_keys(&mut next_available);
        available = next_available;
    }

    required
}