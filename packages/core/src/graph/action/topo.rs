use std::collections::HashMap;

use queue::Queue;

pub struct TopoGraph {
    map: HashMap<i64, Vec<(i64, i8)>>,
    pub result: HashMap<i64, i8>,
    anti_map: HashMap<i64, Vec<(i64, i8)>>,
    in_degree: HashMap<i64, i64>,
    out_degree: HashMap<i64, i64>,
    max_node_id: i64,
}

impl TopoGraph {
    pub fn new(max_node_id: i64) -> Self {
        TopoGraph {
            map: HashMap::new(),
            result: HashMap::new(),
            anti_map: HashMap::new(),
            in_degree: HashMap::new(),
            out_degree: HashMap::new(),
            max_node_id,
        }
    }

    pub fn add_edge(&mut self, u: i64, v: i64, w: i8) {
        self.map.entry(u).or_default().push((v, w));
        self.anti_map.entry(v).or_default().push((v, w));
        *self.in_degree.entry(v).or_insert(0) += 1;
        *self.out_degree.entry(u).or_insert(0) += 1;
        self.max_node_id = self.max_node_id.max(u).max(v);
    }

    pub fn init(&mut self, s: i64) {
        let mut que = Queue::new();
        let _ = que.queue(s);
        self.result.insert(s, 1);
        while let Some(u) = que.dequeue() {
            let current_value = *self.result.get(&u).unwrap_or(&0);
            for i in self.map.get(&u).unwrap_or(&vec![]) {
                let (v, w) = *i;
                if current_value == 1 && w == 1 {
                    *self.result.entry(v).or_insert(0) = 1;
                }
                *self.in_degree.entry(v).or_insert(0) -= 1;
                if *self.in_degree.get(&v).unwrap() == 0 {
                    let _ = que.queue(v);
                }
            }
        }
    }
}