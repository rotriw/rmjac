## Graph Macro

我们实现了

```rust
pub struct Saved<T> {
    pub node_id: i64,
    pub data: T,
}
```


你只需要在需要的地方使用

```rust
#[derive(Clone, Debug, Edge)]
#[edge(basic, perm)]
pub struct SystemPerm {
    u: i64,
    v: i64,
    perm: i64,
}
```

会被自动展开成

```rust
#[derive(Clone, Debug)]
pub struct SystemPerm {
    u: i64,
    v: i64,
    perm: i64,
}

pub struct SystemPermRaw {
    pub u: i64,
    pub v: i64,
    pub perm: i64,
}

mod orm_db {
    mod entity {
        #[derive(Clone, Debug, Entity)]
        struct Model {
            id: i64,
            u: i64,
            v: i64,
            perm: i64,
        }
        
        // ...
    } 
    
    mod iden {
        #[derive(Iden)]
        enum SystemPerm {
            Table,
            Id,
            U,
            V,
            Perm,
        }
    }
}

pub fn export_table() -> Table {
    // ...
}

```

```rust
#[derive(Node)]
#[node]
pub struct User {
    #[node_id]
    node_id: i64,
    username: String,
    email: String,
    creation_time: NaiveDateTime,
    #[node()]
    status: Status,
}

```

需要注意，此项目仍然处在 WIP 状态。
许多方法仍需完善。

**Rotriw Team** 2026