use proc_macro::TokenStream;
use quote::{ToTokens, format_ident, quote};
use syn::{DeriveInput, parse_macro_input};

/// 权限检查属性宏（用于函数）
/// 
/// 用法：
/// ```ignore
/// #[perm("system:view")]
/// async fn my_handler(...) -> ... { ... }
/// ```
#[proc_macro_attribute]
pub fn perm(attr: TokenStream, item: TokenStream) -> TokenStream {
    let input = parse_macro_input!(item as syn::ItemFn);
    let perm = parse_macro_input!(attr as syn::LitStr);

    let func_name = &input.sig.ident;
    let func_args = &input.sig.inputs;
    let func_body = &input.block;
    let func_return = &input.sig.output;
    // check return type is HttpResponse or String
    let return_data = if func_return
        .into_token_stream()
        .to_string()
        .contains("HttpResponse")
    {
        quote! {
            return Ok(actix_web::HttpResponse::InternalServerError().body(Json! {
                "code": -2,
                "msg": "No permission."
            }));
        }
    } else {
        quote! {
            return Ok(Json! {
                "code": -2,
                "msg": "No permission."
            }.into());
        }
    };

    let expanded = quote! {
        async fn #func_name(___req: actix_web::HttpRequest, #func_args) #func_return {
            let perm_context = check_user_permission(&___req, #perm).await;
            if !perm_context.has_permission {
                #return_data
            }

            #func_body
        }
    };

    TokenStream::from(expanded)
}

/// PermProvider derive 宏
/// 
/// 为权限枚举自动生成权限服务相关代码，包括：
/// - `SERVICE` 静态变量
/// - `Related` 类型别名
/// - `{EnumName}PermService` 结构体
/// - `init`, `add_perm`, `remove_perm`, `check` 方法
///
/// # 属性参数
/// 
/// - `edge_module`: 边模块名（如 "perm_manage"）
/// - `edge_type`: 边类型名（如 "PermManageEdge"），默认为 "Perm{EnumName}Edge"
/// - `edge_raw_type`: 边原始类型名（如 "PermManageEdgeRaw"），默认为 "Perm{EnumName}EdgeRaw"
/// 
/// # 用法
/// 
/// ```ignore
/// #[derive(Clone, Copy, Debug, PartialEq, Eq, EnumCount, EnumIter, PermProvider)]
/// #[perm_provider(edge_module = "perm_manage")]
/// #[repr(i64)]
/// pub enum Manage {
///     All = -1,
///     View = 1,
///     Edit = 2,
/// }
/// ```
/// 
/// 这将生成：
/// - `pub static ref SERVICE: Mutex<...>`
/// - `pub type Related = PermEdge<...>`  
/// - `pub struct ManagePermService`
/// - `impl Manage { pub async fn init(...), pub async fn add_perm(...), ... }`
#[proc_macro_derive(PermProvider, attributes(perm_provider))]
pub fn derive_perm_provider(input: TokenStream) -> TokenStream {
    let input = parse_macro_input!(input as DeriveInput);
    let enum_name = &input.ident;
    
    // 解析属性
    let mut edge_module: Option<String> = None;
    let mut edge_type: Option<String> = None;
    let mut edge_raw_type: Option<String> = None;
    
    for attr in &input.attrs {
        if attr.path().is_ident("perm_provider") {
            let _ = attr.parse_nested_meta(|meta| {
                if meta.path.is_ident("edge_module") {
                    let value: syn::LitStr = meta.value()?.parse()?;
                    edge_module = Some(value.value());
                } else if meta.path.is_ident("edge_type") {
                    let value: syn::LitStr = meta.value()?.parse()?;
                    edge_type = Some(value.value());
                } else if meta.path.is_ident("edge_raw_type") {
                    let value: syn::LitStr = meta.value()?.parse()?;
                    edge_raw_type = Some(value.value());
                }
                Ok(())
            });
        }
    }
    
    let edge_module = edge_module.expect("perm_provider requires edge_module attribute");
    let edge_module_ident = format_ident!("{}", edge_module);
    
    // 默认类型名
    let default_edge_type = format!("Perm{}Edge", enum_name);
    let default_edge_raw_type = format!("Perm{}EdgeRaw", enum_name);
    
    let edge_type_name = edge_type.unwrap_or(default_edge_type);
    let edge_raw_type_name = edge_raw_type.unwrap_or(default_edge_raw_type);
    
    let edge_type_ident = format_ident!("{}", edge_type_name);
    let edge_raw_type_ident = format_ident!("{}", edge_raw_type_name);
    
    // 生成 PermService 结构体名
    let perm_service_name = format_ident!("{}PermService", enum_name);
    
    let expanded = quote! {
        // 使用 lazy_static 定义静态服务
        lazy_static::lazy_static! {
            /// 权限服务静态实例
            pub static ref SERVICE: std::sync::Mutex<
                crate::service::perm::impled::DefaultPermService<
                    crate::service::perm::impled::PermEnum<#enum_name>
                >
            > = std::sync::Mutex::new(
                crate::service::perm::impled::DefaultPermService::new()
            );
        }
        
        /// 相关的 PermEdge 类型别名
        pub type Related = crate::graph::edge::perm::PermEdge<
            crate::db::entity::edge::#edge_module_ident::ActiveModel,
            crate::db::entity::edge::#edge_module_ident::Model,
            crate::db::entity::edge::#edge_module_ident::Entity,
            crate::graph::edge::#edge_module_ident::#edge_type_ident,
            crate::graph::edge::#edge_module_ident::#edge_raw_type_ident
        >;
        
        /// 权限服务结构体
        /// 
        /// 提供静态方法风格的权限验证，例如:
        /// ```ignore
        /// ManagePermService.verify(user_id, target_id, Manage::View)
        /// ```
        pub struct #perm_service_name;
        
        impl #perm_service_name {
            /// 验证权限
            pub fn verify(&self, u: i64, v: i64, perm: #enum_name) -> bool {
                use crate::service::perm::typed::PermVerifySerivce;
                let service = SERVICE.lock().unwrap();
                service.verify(u, v, perm)
            }
        }
        
        impl std::ops::Add for #enum_name {
            type Output = crate::service::perm::impled::PermEnum<#enum_name>;
            fn add(self, rhs: Self) -> Self::Output {
                use tap::Conv;
                self.conv::<Self::Output>() + rhs
            }
        }

        impl #enum_name {
            pub fn export(db: &sea_orm::DatabaseConnection) -> impl crate::service::perm::typed::PermActionService<crate::service::perm::impled::PermEnum<#enum_name>> {
                let x = &mut *SERVICE.lock().unwrap();
                (x, (&Related::new(), &db))
            }
        }
    };
    
    TokenStream::from(expanded)
}
