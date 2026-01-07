//! Handler宏系统
//! 
//! 提供声明式的宏来简化Actix-web handler的编写，自动处理路由、参数解析、
//! before函数链和权限检查。

use proc_macro::TokenStream;
use syn::{parse_macro_input, Item, ItemMod};
use quote::quote;

mod types;
mod parser;
mod dependency;
mod codegen;
mod utils;

use parser::{parse_handler_struct, parse_impl_block};
use codegen::generate_handler_impl;

/// 主handler宏 - 应用于包含handler结构体和impl的模块
/// 
/// 这个宏会处理整个模块，自动生成路由处理代码
/// 
/// # 用法
/// 
/// ```ignore
/// #[generate_handler]
/// mod my_handler {
///     #[handler(path = "/api/problem/view")]
///     pub struct View {
///         basic: BasicHandler,
///     }
///     
///     impl View {
///         #[from_path(iden)]
///         #[export(id, other)]
///         async fn before_expand_id(self, iden: &str) -> ResultHandler<(i64, String)> {
///             // ...
///         }
///         
///         #[perm]
///         async fn require_sudo(self, id: &i64) -> bool {
///             // ...
///         }
///
///         #[handler]
///         #[route("{iden}")]
///         async fn post_normal(self, id: i64, iden: &str, user_name: &str) -> ResultHandler<String> {
///             // ...
///         }
///     }
/// }
/// ```
#[proc_macro_attribute]
pub fn generate_handler(_attr: TokenStream, item: TokenStream) -> TokenStream {
    let module = parse_macro_input!(item as ItemMod);
    
    if let Some((_, items)) = &module.content {
        let mut handler_struct = None;
        let mut impl_block = None;
        let mut other_items = Vec::new();
        
        for item in items {
            match item {
                Item::Struct(s) => {
                    // 检查是否有handler属性
                    if s.attrs.iter().any(|attr| attr.path().is_ident("handler")) {
                        handler_struct = Some(s.clone());
                    } else {
                        other_items.push(item.clone());
                    }
                }
                Item::Impl(i) => {
                    impl_block = Some(i.clone());
                }
                _ => other_items.push(item.clone()),
            }
        }
        
        if let (Some(struct_def), Some(impl_def)) = (handler_struct, impl_block) {
            // 解析handler结构体
            let handler_struct_info = match parse_handler_struct(&struct_def) {
                Ok(info) => info,
                Err(e) => return e.to_compile_error().into(),
            };
            
            // 解析impl块
            let (before_funcs, perm_funcs, handler_funcs) = match parse_impl_block(&impl_def) {
                Ok(result) => result,
                Err(e) => return e.to_compile_error().into(),
            };
            
            // 生成代码
            let generated = match generate_handler_impl(
                &handler_struct_info,
                &before_funcs,
                &perm_funcs,
                &handler_funcs,
            ) {
                Ok(code) => code,
                Err(e) => return syn::Error::new(
                    proc_macro2::Span::call_site(),
                    e,
                ).to_compile_error().into(),
            };
            
            let mod_name = &module.ident;
            let mod_vis = &module.vis;
            
            return quote! {
                #mod_vis mod #mod_name {
                    #(#other_items)*
                    
                    #struct_def
                    
                    #impl_def
                    
                    #generated
                }
            }.into();
        }
    }
    
    // 如果解析失败，返回原始代码
    quote! { #module }.into()
}

/// 标记handler结构体的属性宏
/// 
/// # 示例
/// 
/// ```ignore
/// #[handler(path = "/api/problem/view")]
/// pub struct View {
///     basic: BasicHandler,
/// }
/// ```
#[proc_macro_attribute]
pub fn handler(_attr: TokenStream, item: TokenStream) -> TokenStream {
    // 这个宏主要用于标记，实际处理在generate_handler中
    item
}

/// 标记从路径参数中获取的参数
/// 
/// # 示例
/// 
/// ```ignore
/// #[from_path(iden, id)]
/// async fn before_xxx(self, iden: &str, id: i64) -> ResultHandler<...> {
///     // ...
/// }
/// ```
#[proc_macro_attribute]
pub fn from_path(_attr: TokenStream, item: TokenStream) -> TokenStream {
    // 这个宏主要用于标记，实际解析在generate_handler中处理
    item
}

/// 标记导出的值，供其他函数使用
/// 
/// # 示例
/// 
/// ```ignore
/// #[export(problem_id, statement_id)]
/// async fn before_xxx(self, ...) -> ResultHandler<(i64, i64)> {
///     // ...
/// }
/// ```
#[proc_macro_attribute]
pub fn export(_attr: TokenStream, item: TokenStream) -> TokenStream {
    // 这个宏主要用于标记，实际解析在generate_handler中处理
    item
}

/// 标记权限检查函数
/// 
/// # 示例
/// 
/// ```ignore
/// #[perm]
/// async fn check_permission(self, id: &i64) -> bool {
///     // 权限检查逻辑
/// }
/// ```
#[proc_macro_attribute]
pub fn perm(_attr: TokenStream, item: TokenStream) -> TokenStream {
    // 这个宏主要用于标记，实际解析在generate_handler中处理
    item
}

/// 标记HTTP路由路径
///
/// # 示例
///
/// ```ignore
/// #[handler]
/// #[route("/users/{id}")]
/// async fn get_user(self, id: i64) -> ResultHandler<String> {
///     // ...
/// }
/// ```
#[proc_macro_attribute]
pub fn route(_attr: TokenStream, item: TokenStream) -> TokenStream {
    // 这个宏主要用于标记，实际解析在generate_handler中处理
    item
}