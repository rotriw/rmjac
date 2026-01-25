//! Handler宏系统
//!
//! 提供声明式的宏来简化Actix-web handler的编写，自动处理路由、参数解析、
//! before函数链和权限检查。

use darling::FromMeta;
use darling::util::parse_attribute_to_meta_list;
use proc_macro::TokenStream;
use quote::{TokenStreamExt, quote};
use syn::punctuated::Punctuated;
use syn::spanned::Spanned;
use syn::{Attribute, Expr, Item, ItemMod, Lit, Meta, Path, Token, parse_macro_input, parse_quote};

mod codegen;
mod dependency;
#[cfg(feature = "export_ts_type")]
mod export;
mod parser;
mod types;
mod utils;

#[cfg(feature = "export_ts_type")]
#[proc_macro]
pub fn start_export_ts_type(_item: TokenStream) -> TokenStream {
    export::generate_all().into()
}

use crate::parser::{FuncType, parse_func};
use crate::types::HandlerStruct;
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
///     #[from_path(iden)]
///     #[export(id, other)]
///     async fn before_expand_id(self, iden: &str) -> ResultHandler<(i64, String)> {
///         // ...
///     }
///
///     #[perm]
///     async fn require_sudo(self, id: &i64) -> bool {
///         // ...
///     }
///
///     #[handler]
///     #[route("/{iden}")]
///     async fn post_normal(self, id: i64, iden: &str, user_name: &str) -> ResultHandler<String> {
///         // ...
///     }
/// }
/// ```
///
#[proc_macro_attribute]
pub fn generate_handler(_attr: TokenStream, item: TokenStream) -> TokenStream {
    generate_handler_final(_attr, item)
}

fn generate_handler_final(attr: TokenStream, item: TokenStream) -> TokenStream {
    let module = parse_macro_input!(item as ItemMod);
    let args = parse_macro_input!(attr with Punctuated::<Meta, Token![,]>::parse_terminated);
    let mut route_path = "".to_string();
    let mut real_path = "".to_string();
    for meta in args {
        if let Meta::NameValue(nv) = meta {
            if nv.path.is_ident("route") {
                if let Expr::Lit(expr_lit) = nv.value {
                    if let Lit::Str(lit_str) = expr_lit.lit {
                        route_path = lit_str.value();
                    }
                }
            } else if nv.path.is_ident("real_path") {
                if let Expr::Lit(expr_lit) = nv.value {
                    if let Lit::Str(lit_str) = expr_lit.lit {
                        real_path = lit_str.value();
                    }
                }
            }
        }
    }
    if route_path == "" {
        route_path = module.ident.to_string().clone();
    }

    if let Some((_, items)) = &module.content {
        let mut handler_struct = None;
        let mut other_items = Vec::new();

        let mut before_funcs = Vec::new();
        let mut perm_funcs = Vec::new();
        let mut handler_funcs = Vec::new();

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
                Item::Fn(i) => {
                    match parse_func(i) {
                        Ok(FuncType::BeforeFunction(f)) => {
                            before_funcs.push(f);
                        }
                        Ok(FuncType::HandlerFunction(f)) => {
                            handler_funcs.push(f);
                        }
                        Ok(FuncType::PermFunction(f)) => {
                            perm_funcs.push(f);
                        }
                        Ok(_) => {}
                        Err(e) => {
                            return e.to_compile_error().into();
                        }
                    }
                    other_items.push(item.clone());
                }
                _ => other_items.push(item.clone()),
            }
        }

        let generated = match generate_handler_impl(
            &real_path,
            &route_path,
            &before_funcs,
            &perm_funcs,
            &handler_funcs,
        ) {
            Ok(code) => code,
            Err(e) => {
                return syn::Error::new(proc_macro2::Span::call_site(), e)
                    .to_compile_error()
                    .into();
            }
        };

        let mod_name = &module.ident;
        let mod_vis = &module.vis;

        return quote! {
            #mod_vis mod #mod_name {
                #(#other_items)*
                #generated
            }
        }
        .into();
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

/// 标记该 Handler 需要登录。
/// 开启该标记后，所有需要调用此函数的链路上会自动拒绝非登录用户，同时返回值可以获取到实际用户。
#[proc_macro_attribute]
pub fn require_login(_attr: TokenStream, item: TokenStream) -> TokenStream {
    item
}

/// 强制要求 Handler 的 props 包含的列表。
/// 使用此prop即有能力允许拓宽使用的 before 函数。
#[proc_macro_attribute]
pub fn require_prop(_attr: TokenStream, item: TokenStream) -> TokenStream {
    item
}
