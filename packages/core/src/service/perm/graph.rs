use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use crate::service::perm::typed::{GetU, GetV, GraphAction, HasPath, NextValue, PathAction, PermVerify};

#[derive(Debug, Serialize, Deserialize)]
pub struct Graph {
    pub node: HashMap<i64, Node>
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Node {
    pub next: Vec<(i64, i64)>,
    pub prev: Vec<(i64, i64)>,
}

impl GetU for Graph {
    fn get_total_u(&self, id: i64) -> Vec<NextValue<i64>> {
        match self.node.get(&id) {
            Some(node) => node.prev.iter().map(|(nxt, perm)| NextValue {
                point: *nxt,
                perm: *nxt,
                count: self.node.get(nxt).unwrap_or(&Node {next: vec![], prev: vec![]}).prev.len() as i64,
            }).collect(),
            None => vec![],
        }
    }
}

impl GetV for Graph {
    fn get_total_v(&self, id: i64) -> Vec<NextValue<i64>> {
        match self.node.get(&id) {
            Some(node) => node.next.iter().map(|(nxt, _perm)| NextValue {
                point: *nxt,
                perm: *nxt,
                count: self.node.get(nxt).unwrap_or(&Node {next: vec![], prev: vec![]}).next.len() as i64,
            }).collect(),
            None => vec![],
        }
    }
}

impl PathAction for Graph {
    fn add_perm<T: Into<i64>>(&mut self, u: i64, v: i64, perm: T) {
        // Implementation to add permission from u to v
        let perm = perm.into();
        self.node.entry(u).or_insert(Node {next: vec![], prev: vec![]}).next.push((v, perm));
        self.node.entry(v).or_insert(Node {next: vec![], prev: vec![]}).prev.push((u, perm));
    }

    fn del_perm(&mut self, u: i64, v: i64) {
        self.node.entry(u).or_insert(Node {next: vec![], prev: vec![]}).next.retain(|(nxt, _)| *nxt != v);
        self.node.entry(v).or_insert(Node {next: vec![], prev: vec![]}).prev.retain(|(nxt, _)| *nxt != u);
    }
}

impl HasPath for Graph {
    fn verify<T: PermVerify>(&self, u: i64, v: i64, perm: &T) -> (bool, bool) {
        self.node.get(&u).map_or((false, false), |node| {
            for (nxt, p) in &node.next {
                if *nxt == v && perm.verify(*p) {
                    return (true, true);
                }
            }
            (false, false)
        })
    }
}
impl GraphAction for Graph {}