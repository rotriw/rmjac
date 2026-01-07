# Handler宏系统

## 概述

`macro_handler`提供了一套声明式的宏，用于简化Actix-web handler的编写，自动处理路由、参数解析、before函数链和权限检查。

## 当前实现状态

### ✅ 已完成的核心组件

1. **类型系统** (`src/types.rs`)
   - `HandlerStruct`: Handler结构体元数据
   - `BeforeFunction`: Before函数元数据
   - `PermFunction`: 权限检查函数元数据
   - `HandlerFunction`: Handler函数元数据
   - `DependencyGraph`: 依赖图数据结构

2. **解析器** (`src/parser.rs`)
   - 解析handler结构体属性
   - 解析impl块中的各种函数
   - 提取路径变量
   - 识别before/perm/handler函数

3. **依赖分析** (`src/dependency.rs`)
   - 构建Before函数依赖图
   - 拓扑排序算法
   - 循环依赖检测
   - 自动计算执行顺序

4. **代码生成器** (`src/codegen.rs`)
   - 生成Props结构体
   - 生成路由处理函数
   - 生成before函数调用链
   - 生成权限检查逻辑
   - 生成`export_http_service()`方法

5. **工具函数** (`src/utils.rs`)
   - 类型检查和转换工具

## 设计原理

### 宏的工作流程

```
用户代码 (带宏标记)
    ↓
generate_handler宏解析
    ↓
提取结构体和impl块信息
    ↓
解析before/perm/handler函数
    ↓
构建依赖图并排序
    ↓
生成Props和路由函数
    ↓
输出完整代码
```

### 依赖分析算法

1. **构建依赖图**: 分析每个before函数需要哪些参数，这些参数来自其他哪些before函数的导出
2. **拓扑排序**: 使用Kahn算法对before函数进行排序，确保依赖的函数先执行
3. **循环检测**: 如果存在循环依赖，编译时报错

### 参数来源分析

对于handler函数的每个参数，宏会自动判断其来源：

1. **路径参数**: 如果参数名出现在路径模板的`{}`中
2. **Before导出**: 如果参数名在某个before函数的`#[export]`列表中
3. **请求体/查询参数**: 其他参数，自动生成Props结构体
   - GET请求: 使用查询字符串
   - POST/PUT/PATCH请求: 使用JSON请求体

## 预期使用方式

```rust
use macro_handler::{generate_handler, handler, from_path, export, perm};

#[generate_handler]
mod problem_view {
    #[handler(path = "/api/problem/view")]
    pub struct View {
        basic: BasicHandler,
    }
    
    impl View {
        // Before函数: 从路径获取id，导出expanded_id和name
        #[from_path(iden)]
        #[export(expanded_id, name)]
        async fn before_expand(self, iden: &str) -> ResultHandler<(i64, String)> {
            let id = iden.parse::<i64>()?;
            Ok((id, format!("problem_{}", id)))
        }
        
        // 权限检查函数
        #[perm]
        async fn check_perm(self, expanded_id: &i64) -> bool {
            *expanded_id > 0
        }
        
        // Handler函数: GET /api/problem/view/{iden}
        #[handler]
        #[path("{iden}")]
        async fn get_detail(
            self,
            expanded_id: i64,  // 来自before_expand导出
            name: &str,        // 来自before_expand导出
        ) -> ResultHandler<ProblemDetail> {
            // 实现逻辑
        }
        
        // Handler函数: POST /api/problem/view/{iden}/update
        #[handler]
        #[path("{iden}/update")]
        async fn post_update(
            self,
            expanded_id: i64,  // 来自before_expand导出
            new_title: &str,   // 来自请求体
            new_desc: &str,    // 来自请求体
        ) -> ResultHandler<()> {
            // 实现逻辑
        }
    }
}

// 自动生成的代码包括:
// - PostUpdateProps结构体(包含new_title, new_desc)
// - __route_get_detail函数
// - __route_post_update函数  
// - View::export_http_service()方法
```

## 当前限制和待改进

### 需要修复的问题

1. **属性解析**: `#[handler(path = "...")]`的解析需要使用正确的语法
2. **错误处理**: 需要更好的编译时错误信息
3. **类型推导**: 自动类型转换逻辑需要完善
4. **测试覆盖**: 需要更多的单元测试和集成测试

### 后续改进方向

1. **支持更多HTTP方法**: HEAD, OPTIONS等
2. **中间件集成**: 支持自定义中间件
3. **文档生成**: 自动生成API文档
4. **性能优化**: 减少生成代码的体积

## 技术栈

- `syn 2.0`: AST解析
- `quote`: 代码生成
- `proc-macro2`: 过程宏支持
- `darling`: 属性解析辅助

## 开发状态

- ✅ 核心架构设计完成
- ✅ 依赖分析算法实现
- ✅ 代码生成器框架完成
- ⚠️ 属性解析需要修复
- ⚠️ 测试用例需要补充
- ⚠️ 实际项目集成待验证

## 相关文档

- `plans/handler_macro_design.md`: 详细设计文档
- `plans/handler_macro_implementation_spec.md`: 实现规范
- `plans/handler_macro_examples.md`: 使用示例
- `plans/handler_macro_architecture.md`: 架构图

## 贡献指南

1. 修改代码后运行 `cargo check` 确保编译通过
2. 添加相应的测试用例
3. 更新相关文档
4. 提交前运行 `cargo fmt` 格式化代码

## 许可证

与主项目保持一致