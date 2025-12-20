use lazy_static::lazy_static;
use std::{collections::HashMap, sync::Mutex};
use std::sync::Arc;
use std::sync::RwLock;
use sea_orm::DatabaseConnection;
use socketioxide::extract::SocketRef;
use crate::graph::action::DefaultNodes;
use crate::service::iden::ac_automaton::AcMachine;

/// PermGraph 存储权限图的邻接表
/// 对于每个节点 i64，存储一个 Vec<(i64, i64, i64)>
/// 表示 (目标节点ID, 边ID, 边的权限值)
///
/// 结构：
/// - 外层 HashMap: edge_type (String) -> 该类型边的邻接表
/// - 内层 HashMap: 源节点ID (i64) -> Vec<(目标节点ID, 边ID, 权限值)>
#[derive(Debug, Clone, Default)]
pub struct PermGraph {
    /// 存储所有权限边的邻接表
    /// edge_type -> (source_node -> Vec<(target_node, edge_id, perm)>)
    pub adjacency: HashMap<String, HashMap<i64, Vec<(i64, i64, i64)>>>,
}

impl PermGraph {
    pub fn new() -> Self {
        PermGraph {
            adjacency: HashMap::new(),
        }
    }

    /// 添加一条权限边
    pub fn add_edge(&mut self, edge_type: &str, u: i64, v: i64, edge_id: i64, perm: i64) {
        self.adjacency
            .entry(edge_type.to_string())
            .or_default()
            .entry(u)
            .or_default()
            .push((v, edge_id, perm));
    }

    /// 删除一条权限边（通过边ID）
    pub fn remove_edge_by_id(&mut self, edge_type: &str, edge_id: i64) {
        if let Some(type_map) = self.adjacency.get_mut(edge_type) {
            for edges in type_map.values_mut() {
                edges.retain(|(_, eid, _)| *eid != edge_id);
            }
        }
    }

    /// 删除指定 u -> v 的所有边
    pub fn remove_edge(&mut self, edge_type: &str, u: i64, v: i64) {
        if let Some(type_map) = self.adjacency.get_mut(edge_type) {
            if let Some(edges) = type_map.get_mut(&u) {
                edges.retain(|(target, _, _)| *target != v);
            }
        }
    }

    /// 获取从节点 u 出发的所有边（指定边类型）
    pub fn get_edges(&self, edge_type: &str, u: i64) -> Vec<(i64, i64, i64)> {
        self.adjacency
            .get(edge_type)
            .and_then(|m| m.get(&u))
            .cloned()
            .unwrap_or_default()
    }

    /// 清空指定类型的边
    pub fn clear_edge_type(&mut self, edge_type: &str) {
        self.adjacency.remove(edge_type);
    }

    /// 清空所有边
    pub fn clear(&mut self) {
        self.adjacency.clear();
    }

    /// 使用 DFS 检查从 u 到 v 是否存在满足权限要求的路径
    /// 返回值：1 = 有权限, 0 = 无权限, -1 = 超过最大步数
    pub fn check_perm_dfs(
        &self,
        edge_type: &str,
        u: i64,
        v: i64,
        required_perm: i64,
        max_steps: i64,
    ) -> i8 {
        if u == v {
            return 1;
        }
        
        let mut visited = std::collections::HashSet::new();
        self.dfs_helper(edge_type, u, v, required_perm, 0, max_steps, &mut visited)
    }

    fn dfs_helper(
        &self,
        edge_type: &str,
        current: i64,
        target: i64,
        required_perm: i64,
        current_step: i64,
        max_steps: i64,
        visited: &mut std::collections::HashSet<i64>,
    ) -> i8 {
        if current_step > max_steps {
            return -1;
        }

        if visited.contains(&current) {
            return 0;
        }
        visited.insert(current);

        let edges = self.get_edges(edge_type, current);
        for (next_node, _edge_id, perm) in edges {
            // 检查权限：required_perm 的所有位都必须在 perm 中存在
            if (required_perm & perm) != required_perm {
                continue;
            }

            if next_node == target {
                return 1;
            }

            let result = self.dfs_helper(
                edge_type,
                next_node,
                target,
                required_perm,
                current_step + 1,
                max_steps,
                visited,
            );

            if result == 1 {
                return 1;
            }
            if result == -1 {
                return -1;
            }
        }

        0
    }

    /// 检查多个权限位（每个位独立检查）
    pub fn check_perm_multi(
        &self,
        edge_type: &str,
        u: i64,
        v: i64,
        required_perm: i64,
        max_steps: i64,
    ) -> i8 {
        if u == v {
            return 1;
        }
        
        let mut perm = required_perm;
        while perm > 0 {
            let lowbit = perm & (-perm);
            let result = self.check_perm_dfs(edge_type, u, v, lowbit, max_steps);
            if result != 1 {
                return result;
            }
            perm -= lowbit;
        }
        1
    }
}

lazy_static! {
    pub static ref REDIS_URL: Mutex<String> = Mutex::new("redis://localhost:6379".to_string());
    pub static ref REDIS_CLIENT: Mutex<redis::Client> = Mutex::new(
        redis::Client::open(REDIS_URL.lock().unwrap().clone())
            .expect("Failed to create Redis client")
    );

    pub static ref PATH_VIS: Mutex<HashMap<i32, HashMap<i64, bool>>> = Mutex::new(HashMap::new());
    pub static ref SAVED_NODE_PATH: Mutex<HashMap<(i64, String), HashMap<i64, i64>>> =
        Mutex::new(HashMap::new());
    pub static ref SAVED_NODE_PATH_REV: Mutex<HashMap<(i64, String), HashMap<i64, i64>>> =
        Mutex::new(HashMap::new());
    pub static ref SAVED_NODE_PATH_LIST: Mutex<HashMap<String, Vec<i64>>> =
        Mutex::new(HashMap::new());
    pub static ref SAVED_NODE_CIRCLE_ID: Mutex<i32> = Mutex::new(0);
    pub static ref DEFAULT_NODES: Mutex<DefaultNodes> = Mutex::new(DefaultNodes {
        guest_user_node: -1,
        default_strategy_node: -1,
        default_iden_node: -1,
        default_system_node: -1,
    });

    pub static ref DB_URL: Mutex<String> = Mutex::new("postgres://localhost/rmjac".to_string());
    pub static ref DB_SCHEMA: Mutex<String> = Mutex::new("public".to_string());
    pub static ref CONNECTION_POOL: Arc<Mutex<Option<DatabaseConnection>>> = Arc::new(Mutex::new(None));

    pub static ref EDGE_AUTH_PUBLICKEY: Mutex<String> = Mutex::new("".to_string());
    pub static ref EDGE_AUTH_MAP: Mutex<HashMap<String, i32>> = Mutex::new(HashMap::new());
    pub static ref EDGE_SOCKETS: Mutex<HashMap<String, SocketRef>> = Mutex::new(HashMap::new());
    pub static ref EDGE_VEC: Mutex<Vec<String>> = Mutex::new(vec![]);
    pub static ref EDGE_NUM: Mutex<i32> = Mutex::new(0);

    pub static ref SLICE_WORD_LIST: Mutex<Vec<String>> = Mutex::new(vec![]);
    pub static ref SLICE_WORD_ACMAC: Mutex<AcMachine> = Mutex::new(AcMachine::build(SLICE_WORD_LIST.lock().unwrap().clone().iter().map(AsRef::as_ref).collect()));

    pub static ref USER_WEBSOCKET_CONNECTIONS: Mutex<HashMap<String, SocketRef>> = Mutex::new(HashMap::new());

    /// 全局权限图，使用 RwLock 以支持并发读取和独占写入
    pub static ref PERM_GRAPH: RwLock<PermGraph> = RwLock::new(PermGraph::new());
}

pub mod db;