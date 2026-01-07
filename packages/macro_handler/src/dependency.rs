//! 依赖分析和拓扑排序

use crate::types::*;
use std::collections::{HashMap, HashSet, VecDeque};
/// 构建Before函数的依赖图
pub fn build_dependency_graph(
    before_funcs: &[BeforeFunction],
    _handler_func: &HandlerFunction,
) -> Result<DependencyGraph, String> {
    let mut graph = DependencyGraph::new();
    
    // 为每个before函数创建节点
    for before in before_funcs {
        let name = before.name.to_string();
        
        // 分析此before函数依赖哪些其他before的导出
        let mut depends_on = HashSet::new();
        
        // 获取from_path参数列表
        let from_path_params: HashSet<String> = before.from_path.iter()
            .map(|i| i.to_string())
            .collect();
        
        for param in &before.params {
            if param.is_self {
                continue;
            }
            
            let param_name = param.name.to_string();
            
            // 如果参数在from_path中，跳过（来自路径参数）
            if from_path_params.contains(&param_name) {
                continue;
            }
            
            // 检查这个参数是否来自其他before函数的导出
            for other_before in before_funcs {
                if other_before.name == before.name {
                    continue;
                }
                
                if other_before.exports.iter().any(|e| *e == param_name) {
                    depends_on.insert(other_before.name.to_string());
                }
            }
        }
        
        graph.add_node(name, before.exports.clone(), depends_on);
    }
    
    Ok(graph)
}

/// 对before函数进行拓扑排序
pub fn topological_sort(
    graph: &DependencyGraph,
    required_exports: &HashSet<String>,
) -> Result<Vec<String>, String> {
    // 找出所有需要执行的before函数
    let mut required_befores = HashSet::new();
    let mut to_visit: VecDeque<String> = required_exports.iter().cloned().collect();
    
    while let Some(export_name) = to_visit.pop_front() {
        if let Some(provider) = graph.find_provider(&export_name) {
            if required_befores.insert(provider.to_string()) {
                // 新发现的before函数，需要检查它的依赖
                if let Some(node) = graph.nodes.get(provider) {
                    for dep_before in &node.depends_on {
                        if let Some(dep_node) = graph.nodes.get(dep_before) {
                            for dep_export in &dep_node.exports {
                                to_visit.push_back(dep_export.to_string());
                            }
                        }
                    }
                }
            }
        }
    }
    
    // 执行拓扑排序
    let mut in_degree: HashMap<String, usize> = HashMap::new();
    let mut adj_list: HashMap<String, Vec<String>> = HashMap::new();
    
    // 只考虑需要执行的before函数
    for before_name in &required_befores {
        in_degree.insert(before_name.clone(), 0);
        adj_list.insert(before_name.clone(), Vec::new());
    }
    
    // 构建子图的入度和邻接表
    for before_name in &required_befores {
        if let Some(node) = graph.nodes.get(before_name) {
            for dep in &node.depends_on {
                if required_befores.contains(dep) {
                    adj_list.entry(dep.clone())
                        .or_default()
                        .push(before_name.clone());
                    *in_degree.entry(before_name.clone()).or_insert(0) += 1;
                }
            }
        }
    }
    
    // Kahn算法
    let mut queue: VecDeque<String> = in_degree.iter()
        .filter(|(_, &degree)| degree == 0)
        .map(|(name, _)| name.clone())
        .collect();
    
    let mut sorted = Vec::new();
    
    while let Some(node) = queue.pop_front() {
        sorted.push(node.clone());
        
        if let Some(neighbors) = adj_list.get(&node) {
            for neighbor in neighbors {
                if let Some(degree) = in_degree.get_mut(neighbor) {
                    *degree -= 1;
                    if *degree == 0 {
                        queue.push_back(neighbor.clone());
                    }
                }
            }
        }
    }
    
    // 检查是否有循环依赖
    if sorted.len() != required_befores.len() {
        return Err("Circular dependency detected in before functions".to_string());
    }
    
    Ok(sorted)
}

/// 分析handler函数需要的所有导出
pub fn analyze_handler_requirements(
    handler: &HandlerFunction,
    path_vars: &[String],
    before_funcs: &[BeforeFunction],
) -> HashSet<String> {
    let mut required = HashSet::new();
    
    // 收集所有before函数的from_path参数
    let mut from_path_params: HashSet<String> = HashSet::new();
    for before in before_funcs {
        for fp in &before.from_path {
            from_path_params.insert(fp.to_string());
        }
    }
    
    for param in &handler.params {
        if param.is_self {
            continue;
        }
        
        let param_name = param.name.to_string();
        
        // 如果在路径参数或from_path中，跳过
        if path_vars.contains(&param_name) || from_path_params.contains(&param_name) {
            continue;
        }
        
        // 查找提供此导出的before函数
        for before in before_funcs {
            if before.exports.iter().any(|e| *e == param_name) {
                required.insert(param_name.clone());
                break;
            }
        }
    }
    
    required
}

/// 分析perm函数需要的所有导出
pub fn analyze_perm_requirements(
    perm: &PermFunction,
    path_vars: &[String],
    before_funcs: &[BeforeFunction],
) -> HashSet<String> {
    let mut required = HashSet::new();
    
    // 收集所有before函数的from_path参数
    let mut from_path_params: HashSet<String> = HashSet::new();
    for before in before_funcs {
        for fp in &before.from_path {
            from_path_params.insert(fp.to_string());
        }
    }
    
    for param in &perm.params {
        if param.is_self {
            continue;
        }
        
        let param_name = param.name.to_string();
        
        // 如果在路径参数或from_path中，跳过
        if path_vars.contains(&param_name) || from_path_params.contains(&param_name) {
            continue;
        }
        
        for before in before_funcs {
            if before.exports.iter().any(|e| *e == param_name) {
                required.insert(param_name.clone());
                break;
            }
        }
    }
    
    required
}

/// 计算before函数链的执行顺序
pub fn compute_execution_order(
    handler: &HandlerFunction,
    perm_func: Option<&PermFunction>,
    before_funcs: &[BeforeFunction],
    path_vars: &[String],
) -> Result<Vec<String>, String> {
    let graph = build_dependency_graph(before_funcs, handler)?;
    
    // 收集所有需要的导出
    let mut required_exports = analyze_handler_requirements(handler, path_vars, before_funcs);
    
    if let Some(perm) = perm_func {
        required_exports.extend(analyze_perm_requirements(perm, path_vars, before_funcs));
    }
    
    // 如果handler指定了before列表，确保这些before被包含
    if let Some(ref before_list) = handler.before_funcs {
        for before_name in before_list {
            if let Some(before) = before_funcs.iter().find(|b| b.name == *before_name) {
                // 检查before函数的from_path变量是否在当前handler的路径变量中可用
                let from_path_vars: Vec<String> = before.from_path.iter()
                    .map(|i| i.to_string())
                    .collect();
                let all_path_vars_available = from_path_vars.iter()
                    .all(|v| path_vars.contains(v));
                
                if all_path_vars_available {
                    for export in &before.exports {
                        required_exports.insert(export.to_string());
                    }
                }
            }
        }
    } else {
        // 如果没有指定，包含所有"before_"开头的函数（但只包含其from_path变量可用的）
        for before in before_funcs {
            let name = before.name.to_string();
            if name.starts_with("before_") {
                // 检查before函数的from_path变量是否在当前handler的路径变量中可用
                let from_path_vars: Vec<String> = before.from_path.iter()
                    .map(|i| i.to_string())
                    .collect();
                let all_path_vars_available = from_path_vars.iter()
                    .all(|v| path_vars.contains(v));
                
                if all_path_vars_available {
                    for export in &before.exports {
                        required_exports.insert(export.to_string());
                    }
                }
            }
        }
    }
    
    topological_sort(&graph, &required_exports)
}