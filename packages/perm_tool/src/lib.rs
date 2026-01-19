use std::collections::{HashMap, HashSet, VecDeque};
use std::future::Future;

pub trait SaveService {
    fn save_path(&mut self, u: i64, v: i64, perm: i64) -> impl Future<Output = ()>;
    fn del_path(&mut self, u: i64, v: i64, perm: i64) -> impl Future<Output = ()>;
    fn load(&mut self) -> impl Future<Output = Vec<(i64, i64, i64)>>;
}

pub trait PermCombo<T> {}

#[derive(Debug, Clone)]
pub struct Node {
    pub next: Vec<(i64, i64)>, // (v, perm)
    pub prev: Vec<(i64, i64)>, // (u, perm)
}

#[derive(Debug)]
pub struct PermGraph {
    pub node: HashMap<i64, Node>,
    pub has_path: HashMap<(i64, i64), i64>,
    pub count: i64,
}

impl PermGraph {
    pub fn new() -> Self {
        PermGraph {
            node: HashMap::new(),
            has_path: HashMap::new(),
            count: 0,
        }
    }

    pub fn add(&mut self, u: i64, v: i64, perm: i64) {
        let current = self.has_path.get(&(u, v)).cloned().unwrap_or(0);
        let new_perm = current | perm;
        
        if current == 0 {
             self.count += 1;
             self.node.entry(u).or_insert(Node { next: vec![], prev: vec![] }).next.push((v, new_perm));
             self.node.entry(v).or_insert(Node { next: vec![], prev: vec![] }).prev.push((u, new_perm));
        } else {
             // Update existing
             if let Some(node) = self.node.get_mut(&u) {
                 if let Some(e) = node.next.iter_mut().find(|(n, _)| *n == v) {
                     e.1 = new_perm;
                 }
             }
             if let Some(node) = self.node.get_mut(&v) {
                 if let Some(e) = node.prev.iter_mut().find(|(n, _)| *n == u) {
                     e.1 = new_perm;
                 }
             }
        }
        self.has_path.insert((u, v), new_perm);
    }

    pub fn del(&mut self, u: i64, v: i64) {
        if self.has_path.remove(&(u, v)).is_some() {
            self.count -= 1;
            if let Some(node) = self.node.get_mut(&u) {
                node.next.retain(|(nxt, _)| *nxt != v);
            }
            if let Some(node) = self.node.get_mut(&v) {
                node.prev.retain(|(nxt, _)| *nxt != u);
            }
        }
    }

    pub fn remove_perm(&mut self, u: i64, v: i64, perm: i64) {
        if let Some(&current) = self.has_path.get(&(u, v)) {
            let new_perm = current & !perm;
            if new_perm == 0 {
                self.del(u, v);
            } else {
                self.has_path.insert((u, v), new_perm);
                if let Some(node) = self.node.get_mut(&u) {
                    if let Some(e) = node.next.iter_mut().find(|(n, _)| *n == v) {
                        e.1 = new_perm;
                    }
                }
                if let Some(node) = self.node.get_mut(&v) {
                    if let Some(e) = node.prev.iter_mut().find(|(n, _)| *n == u) {
                        e.1 = new_perm;
                    }
                }
            }
        }
    }

    // Meet in middle verification
    pub fn verify(&self, u: i64, v: i64, perm: i64) -> bool {
        let mut visited = HashSet::new();
        self.verify_recursive(u, v, perm, &mut visited)
    }

    fn verify_recursive(&self, u: i64, v: i64, perm: i64, visited: &mut HashSet<(i64, i64)>) -> bool {
        if u == v {
            return true;
        }
        if visited.contains(&(u, v)) {
            return false;
        }
        visited.insert((u, v));

        if let Some(&p) = self.has_path.get(&(u, v)) {
            if (p & perm) != 0 {
                return true;
            }
        }

        let u_node = match self.node.get(&u) {
            Some(n) => n,
            None => return false,
        };
        let v_node = match self.node.get(&v) {
            Some(n) => n,
            None => return false,
        };

        // Heuristic expansion
        let u_next: Vec<(i64, i64)> = u_node.next.iter()
            .filter(|(_, p)| (p & perm) != 0)
            .map(|(id, _)| {
                let count = self.node.get(id).map(|n| n.prev.len()).unwrap_or(0) as i64;
                (count, *id)
            })
            .collect();
            
        let v_prev: Vec<(i64, i64)> = v_node.prev.iter()
            .filter(|(_, p)| (p & perm) != 0)
             .map(|(id, _)| {
                let count = self.node.get(id).map(|n| n.next.len()).unwrap_or(0) as i64;
                (count, *id)
            })
            .collect();

        let mut choice = Vec::new();
        for (c, id) in u_next {
             choice.push((c, 0, id)); 
        }
        for (c, id) in v_prev {
            choice.push((c, 1, id)); 
        }
        
        choice.sort_by_key(|k| k.0);
        
        for (_, dir, point) in choice {
            if dir == 0 {
                if self.verify_recursive(point, v, perm, visited) {
                    return true;
                }
            } else {
                if self.verify_recursive(u, point, perm, visited) {
                    return true;
                }
            }
        }
        
        false
    }

    pub fn get_allow_u(&self, v: i64, perm: i64) -> Vec<i64> {
         let mut visited = HashSet::new();
         let mut result = Vec::new();
         let mut queue = VecDeque::new();
         queue.push_back(v);
         visited.insert(v);
         
         while let Some(curr) = queue.pop_front() {
             if let Some(node) = self.node.get(&curr) {
                 for &(prev_node, p) in &node.prev {
                     if (p & perm) != 0 {
                         if !visited.contains(&prev_node) {
                             visited.insert(prev_node);
                             queue.push_back(prev_node);
                             result.push(prev_node);
                         }
                     }
                 }
             }
         }
         result
    }

    pub fn get_allow_v(&self, u: i64, perm: i64) -> Vec<i64> {
        let mut visited = HashSet::new();
         let mut result = Vec::new();
         let mut queue = VecDeque::new();
         queue.push_back(u);
         visited.insert(u);
         
         while let Some(curr) = queue.pop_front() {
             if let Some(node) = self.node.get(&curr) {
                 for &(next_node, p) in &node.next {
                     if (p & perm) != 0 {
                         if !visited.contains(&next_node) {
                             visited.insert(next_node);
                             queue.push_back(next_node);
                             result.push(next_node);
                         }
                     }
                 }
             }
         }
         result
    }
    pub fn get_path(&self, u: i64, v: i64) -> Option<i64> {
        self.has_path.get(&(u, v)).cloned()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_graph_add_verify() {
        let mut g = PermGraph::new();
        g.add(1, 2, 1); // 1->2 (View)
        g.add(2, 3, 1); // 2->3 (View)
        
        assert!(g.verify(1, 2, 1));
        assert!(g.verify(2, 3, 1));
        assert!(g.verify(1, 3, 1)); // Transitive
        
        assert!(!g.verify(1, 2, 2)); // Wrong perm
    }

    #[test]
    fn test_meet_in_middle() {
         let mut g = PermGraph::new();
         // 1 -> 2 -> 3 -> 4
         g.add(1, 2, 1);
         g.add(2, 3, 1);
         g.add(3, 4, 1);
         
         assert!(g.verify(1, 4, 1));
    }
    
    #[test]
    fn test_cycle() {
        let mut g = PermGraph::new();
        g.add(1, 2, 1);
        g.add(2, 1, 1);
        
        assert!(g.verify(1, 2, 1));
        assert!(g.verify(1, 1, 1));
        assert!(g.verify(2, 1, 1));
    }
    
    #[test]
    fn test_permissions_bitmask() {
        let mut g = PermGraph::new();
        g.add(1, 2, 3); // 1->2 (1|2)
        
        assert!(g.verify(1, 2, 1));
        assert!(g.verify(1, 2, 2));
        assert!(g.verify(1, 2, 3));
    }
    
    #[test]
    fn test_get_allow() {
        let mut g = PermGraph::new();
        g.add(1, 2, 1);
        g.add(2, 3, 1);
        
        let allowed_v = g.get_allow_v(1, 1);
        assert!(allowed_v.contains(&2));
        assert!(allowed_v.contains(&3));
        
        let allowed_u = g.get_allow_u(3, 1);
        assert!(allowed_u.contains(&2));
        assert!(allowed_u.contains(&1));
    }
    
    #[test]
    fn test_remove_perm() {
        let mut g = PermGraph::new();
        g.add(1, 2, 3); // 1|2
        
        g.remove_perm(1, 2, 1);
        assert!(!g.verify(1, 2, 1));
        assert!(g.verify(1, 2, 2));
        
        g.remove_perm(1, 2, 2);
        assert!(!g.verify(1, 2, 2));
        assert!(g.get_path(1, 2).is_none());
    }
}