use queue::Queue;
#[derive(Default)]
pub struct AcMachine {
    idx: usize,
    wd: Vec<usize>,
    fail: Vec<usize>,
    sz: Vec<usize>,
    cnt: Vec<usize>,
    p: Vec<Vec<usize>>,
    ft: Vec<Vec<usize>>,
    wh: Vec<String>,
}

fn get_num_from_char(c: char) -> usize {
    if c.is_ascii_lowercase() {
        (c as u8 - b'a') as usize
    } else if c.is_ascii_uppercase() {
        (c as u8 - b'A' + 26) as usize
    } else if c.is_ascii_digit() {
        (c as u8 - b'0' + 52) as usize
    } else if c == '_' {
        62
    } else if c == '#' {
        63
    } else {
        64
    }
}

impl AcMachine {
    pub fn refresh(&mut self) {
        self.wh.clear();
        for i in 0..=self.idx {
            self.p[i].clear();
            self.ft[i].clear();
            self.sz[i] = 0;
            self.cnt[i] = 0;
            self.fail[i] = 0;
        }
        self.idx = 0;
    }

    pub fn new_node(&mut self) {
        self.sz.push(0);
        self.cnt.push(0);
        self.fail.push(0);
        self.wd.push(0);
        self.ft.push(vec![]);
        self.p.push(vec![0; 65]);
    }

    pub fn insert(&mut self, str: &str) {
        let mut u = 0;
        log::debug!("insert str into acm: {str}");
        for c in str.chars() {
            let nu = get_num_from_char(c);
            if self.p[u][nu] == 0 {
                self.idx += 1;
                self.new_node();
                self.p[u][nu] = self.idx;
            }
            u = self.p[u][nu];
        }
        log::trace!("insert str into acm place: {u}");
        self.wd[u] += 1;
    }

    pub fn dfs(&mut self, x: usize, fa: usize) {
        self.cnt[x] += 1;
        let value = self.ft[x].clone();
        for v in value {
            if v != fa {
                self.dfs(v, x);
                self.cnt[x] += self.cnt[v];
            }
        }
    }

    pub fn build(s: Vec<&str>) -> Self {
        let mut res = Self {
            ..Default::default()
        };
        res.new_node();
        res.p.push(vec![0; 65]);
        for str in s {
            res.insert(str);
        }
        let mut que = Queue::new();
        for i in 0..65 {
            let ver = res.p[0][i];
            if ver != 0 {
                let _ = que.queue(ver);
            }
        }
        while !que.is_empty() {
            let t = que.dequeue().unwrap();
            for i in 0..65 {
                let ver = res.p[t][i];
                if ver == 0 {
                    res.p[t][i] = res.p[res.fail[t]][i];
                } else {
                    res.fail[ver] = res.p[res.fail[t]][i];
                    let _ =que.queue(ver);
                }
            }
        }
        for i in 1..=res.idx {
            res.ft[res.fail[i]].push(i);
        }
        res.dfs(0, 0);
        res
    }

    pub fn query(&self, str: &str) -> usize {
        let mut res = 0;
        let mut p = 0;
        for (i, c) in str.char_indices() {
            let nu = get_num_from_char(c);
            p = self.p[p][nu];
            let mut tp = p;
            while tp != 0 {
                res += self.wd[tp];
                tp = self.fail[tp];
            }
        }

        res
    }
}