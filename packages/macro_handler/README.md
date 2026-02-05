## Handler Macro

更简单，明确的定义handler。本仓库主要实现了自动化展开函数调用链。

您只需要在需要使用的地方声明
`#[generate_handler(route="", real_path="")]`

### 功能

1. 您只需要声明函数的变量。函数以 `method_function()` 命名。
2. 您可以声明 before 函数，通常用于声明函数的变量展开。
3. 您可以声明 perm 函数，通常用于权限检查。
4. 对于每个 handler 函数，我们会自动生成适用于 `actix-web` 的路由处理函数链。
5. 同时自动化生成可供前端调用的，具体到函数的代码。


### 行为

1. 我们会找寻您声明 `generate_handler` 下的所有标记 `#[handler]` 的函数。
2. 此时我们会收集您函数（handler以及handler所需要的perm函数）所需要的变量名，对于 `store | db | user_context` 将会使用具体的值来填充。
3. 除此之外，我们会在 before 函数中寻找您需要的变量，并拓展需要的变量名。
4. 对于所有未知的变量名，我们将生成 Props 结构体，这也就是说，在前端调用时，您需要传递这些变量。

需要注意，此项目仍然处在 WIP 状态。
许多行为仍需完善。

**Rotriw Team** 2026