use crate::service::perm::typed::{
    GetU, GetV, GraphAction, HasPath, NextValue, PathAction, PermVerify,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize)]
pub struct Graph {
    pub node: HashMap<i64, Node>,
    pub has_path: HashMap<(i64, i64), i64>,
    pub count: i64,
}

impl Graph {
    pub fn new() -> Self {
        Graph {
            node: HashMap::new(),
            has_path: HashMap::new(),
            count: 0,
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Node {
    pub next: Vec<(i64, i64)>,
    pub prev: Vec<(i64, i64)>,
}

impl GetU for Graph {
    fn get_total_u(&self, id: i64) -> Vec<NextValue<i64>> {
        match self.node.get(&id) {
            Some(node) => node
                .prev
                .iter()
                .map(|(nxt, perm)| NextValue {
                    point: *nxt,
                    perm: *nxt,
                    count: self
                        .node
                        .get(nxt)
                        .unwrap_or(&Node {
                            next: vec![],
                            prev: vec![],
                        })
                        .prev
                        .len() as i64,
                })
                .collect(),
            None => vec![],
        }
    }
}

impl GetV for Graph {
    fn get_total_v(&self, id: i64) -> Vec<NextValue<i64>> {
        match self.node.get(&id) {
            Some(node) => node
                .next
                .iter()
                .map(|(nxt, _perm)| NextValue {
                    point: *nxt,
                    perm: *nxt,
                    count: self
                        .node
                        .get(nxt)
                        .unwrap_or(&Node {
                            next: vec![],
                            prev: vec![],
                        })
                        .next
                        .len() as i64,
                })
                .collect(),
            None => vec![],
        }
    }
}

impl PathAction for Graph {
    fn add_perm<T: Into<i64>>(&mut self, u: i64, v: i64, perm: T) {
        // Implementation to add permission from u to v
        let perm = perm.into();
        self.count += 1;
        self.has_path.insert((u, v), perm);
        self.node
            .entry(u)
            .or_insert(Node {
                next: vec![],
                prev: vec![],
            })
            .next
            .push((v, perm));
        self.node
            .entry(v)
            .or_insert(Node {
                next: vec![],
                prev: vec![],
            })
            .prev
            .push((u, perm));
    }

    fn del_perm(&mut self, u: i64, v: i64) {
        self.count -= 1;
        self.has_path.remove(&(u, v));
        self.node
            .entry(u)
            .or_insert(Node {
                next: vec![],
                prev: vec![],
            })
            .next
            .retain(|(nxt, _)| *nxt != v);
        self.node
            .entry(v)
            .or_insert(Node {
                next: vec![],
                prev: vec![],
            })
            .prev
            .retain(|(nxt, _)| *nxt != u);
    }
}

impl HasPath for Graph {
    fn has_path<T: PermVerify>(&self, u: i64, v: i64, perm: &T) -> (bool, bool) {
        log::trace!("Checking path from {} to {}", u, v);
        self.has_path.get(&(u, v)).map_or((false, false), |&p| {
            log::trace!("Found path from {} to {} with perm {}", u, v, p);
            if perm.verify(p) {
                (true, true)
            } else {
                (true, false)
            }
        })
    }

    fn get_path(&self, u: i64, v: i64) -> Option<i64> {
        self.has_path.get(&(u, v)).cloned()
    }
}
impl GraphAction for Graph {}

impl Graph {
    pub fn get_count(&self) -> usize {
        self.count as usize
    }

    pub fn get(&self, u: i64, v: i64) -> Option<i64> {
        self.has_path.get(&(u, v)).cloned()
    }
}
