//! 代码生成器

use crate::types::*;
use crate::parser::extract_path_vars;
use crate::dependency::compute_execution_order;
use proc_macro2::TokenStream;
use quote::{quote, format_ident};
use syn::{Ident, Type};
use std::collections::HashMap;

/// 生成完整的handler实现
pub fn generate_handler_impl(
    handler_struct: &HandlerStruct,
    before_funcs: &[BeforeFunction],
    perm_funcs: &[PermFunction],
    handler_funcs: &[HandlerFunction],
) -> Result<TokenStream, String> {
    let struct_name = &handler_struct.name;
    
    // 生成每个handler函数的路由处理器
    let mut route_handlers = Vec::new();
    let mut service_registrations = Vec::new();
    
    for handler in handler_funcs {
        let (handler_impl, service_reg) = generate_route_handler(
            struct_name,
            handler,
            before_funcs,
            perm_funcs,
            &handler_struct.base_path,
        )?;
        
        route_handlers.push(handler_impl);
        service_registrations.push(service_reg);
    }
    
    // 生成export_http_service函数
    let export_service = generate_export_service(
        struct_name,
        &handler_struct.base_path,
        &service_registrations,
    );
    
    Ok(quote! {
        #(#route_handlers)*
        
        #export_service
    })
}

/// 生成单个路由处理器
fn generate_route_handler(
    struct_name: &Ident,
    handler: &HandlerFunction,
    before_funcs: &[BeforeFunction],
    perm_funcs: &[PermFunction],
    _base_path: &str,
) -> Result<(TokenStream, TokenStream), String> {
    let path_template = &handler.path_template;
    
    // 提取路径变量
    let path_vars = extract_path_vars(path_template);
    
    // 确定需要执行的perm函数
    let perm_func = if let Some(ref perm_name) = handler.perm_func {
        perm_funcs.iter().find(|p| &p.name == perm_name)
    } else {
        perm_funcs.iter().find(|p| p.name == "perm")
    };
    
    // 计算before函数执行顺序
    let execution_order = compute_execution_order(
        handler,
        perm_func,
        before_funcs,
        &path_vars,
    )?;
    
    // 分析参数来源
    let mut param_analysis = analyze_parameters(
        handler,
        &path_vars,
        before_funcs,
        &execution_order,
    )?;
    
    // 确保所有路径变量都在path_params中（即使handler不直接使用它们）
    for path_var in &path_vars {
        if !param_analysis.path_params.iter().any(|(n, _)| n.to_string() == *path_var) {
            // 添加缺失的路径参数（类型默认为String）
            let ident = syn::Ident::new(path_var, proc_macro2::Span::call_site());
            let ty: Type = syn::parse_quote!(String);
            param_analysis.path_params.push((ident, ty));
        }
    }
    
    // 生成Props结构体（如果需要）
    let props_struct = if param_analysis.needs_props {
        Some(generate_props_struct(handler, &param_analysis)?)
    } else {
        None
    };
    
    // 生成路由处理函数
    let route_func = generate_route_function(
        struct_name,
        handler,
        &execution_order,
        before_funcs,
        perm_func,
        &param_analysis,
        &path_vars,
    )?;
    
    // 生成服务注册代码
    let service_reg = generate_service_registration(
        handler,
        path_template,
    );
    
    let impl_code = quote! {
        #props_struct
        #route_func
    };
    
    Ok((impl_code, service_reg))
}

/// 参数分析结果
struct ParameterAnalysis {
    needs_props: bool,
    props_fields: Vec<(Ident, Type)>,
    path_params: Vec<(Ident, Type)>,
    before_exports: HashMap<String, (String, Ident)>, // param_name -> (before_name, export_name)
}

/// 分析handler函数的参数来源
fn analyze_parameters(
    handler: &HandlerFunction,
    path_vars: &[String],
    before_funcs: &[BeforeFunction],
    execution_order: &[String],
) -> Result<ParameterAnalysis, String> {
    let mut props_fields = Vec::new();
    let mut path_params = Vec::new();
    let mut before_exports = HashMap::new();
    
    // 收集所有before函数的导出
    let mut available_exports: HashMap<String, String> = HashMap::new();
    for before_name in execution_order {
        if let Some(before) = before_funcs.iter().find(|b| b.name.to_string() == *before_name) {
            for export in &before.exports {
                available_exports.insert(export.to_string(), before_name.clone());
            }
        }
    }
    
    for param in &handler.params {
        if param.is_self {
            continue;
        }
        
        let param_name = param.name.to_string();
        
        // 检查是否为路径参数
        if path_vars.contains(&param_name) {
            path_params.push((param.name.clone(), param.ty.clone()));
        }
        // 检查是否来自before导出
        else if let Some(before_name) = available_exports.get(&param_name) {
            before_exports.insert(
                param_name.clone(),
                (before_name.clone(), param.name.clone())
            );
        }
        // 否则需要从Props获取
        else {
            props_fields.push((param.name.clone(), param.ty.clone()));
        }
    }
    
    Ok(ParameterAnalysis {
        needs_props: !props_fields.is_empty(),
        props_fields,
        path_params,
        before_exports,
    })
}

/// 生成Props结构体
fn generate_props_struct(
    handler: &HandlerFunction,
    analysis: &ParameterAnalysis,
) -> Result<TokenStream, String> {
    let handler_name = &handler.name;
    let props_name = format_ident!("{}Props", 
        handler_name.to_string()
            .split('_')
            .map(|s| {
                let mut chars = s.chars();
                match chars.next() {
                    None => String::new(),
                    Some(f) => f.to_uppercase().collect::<String>() + chars.as_str(),
                }
            })
            .collect::<String>()
    );
    
    // 生成字段，将引用类型转换为所有权类型
    let fields: Vec<_> = analysis.props_fields.iter()
        .map(|(name, ty)| {
            let owned_ty = convert_ref_to_owned(ty);
            quote! { pub #name: #owned_ty }
        })
        .collect();
    
    let derive_attr = match handler.method {
        HttpMethod::Get => quote! {
            #[derive(serde::Deserialize)]
        },
        _ => quote! {
            #[derive(serde::Deserialize)]
        },
    };
    
    Ok(quote! {
        #derive_attr
        struct #props_name {
            #(#fields),*
        }
    })
}

/// 生成路由处理函数
fn generate_route_function(
    struct_name: &Ident,
    handler: &HandlerFunction,
    execution_order: &[String],
    before_funcs: &[BeforeFunction],
    perm_func: Option<&PermFunction>,
    analysis: &ParameterAnalysis,
    path_vars: &[String],
) -> Result<TokenStream, String> {
    let handler_name = &handler.name;
    let route_func_name = format_ident!("__route_{}", handler_name);
    
    // 生成路径参数提取
    let path_extractions = generate_path_extractions(&analysis.path_params);
    
    // 生成Props提取（如果需要）
    let props_extraction = if analysis.needs_props {
        let props_name = format_ident!("{}Props", 
            handler_name.to_string()
                .split('_')
                .map(|s| {
                    let mut chars = s.chars();
                    match chars.next() {
                        None => String::new(),
                        Some(f) => f.to_uppercase().collect::<String>() + chars.as_str(),
                    }
                })
                .collect::<String>()
        );
        
        match handler.method {
            HttpMethod::Get => quote! {
                let props = actix_web::web::Query::<#props_name>::from_query(req.query_string())
                    .map_err(|e| actix_web::error::ErrorBadRequest(e))?
                    .into_inner();
            },
            _ => quote! {
                let props = payload.into_inner();
            },
        }
    } else {
        quote! {}
    };
    
    // 生成before函数调用链
    let before_calls = generate_before_calls(
        execution_order,
        before_funcs,
        &analysis.path_params,
        path_vars,
    )?;
    
    // 生成权限检查（使用 &self 引用）
    let perm_check = if let Some(perm) = perm_func {
        let perm_name = &perm.name;
        let perm_args = generate_function_args(&perm.params, analysis);
        
        quote! {
            if !handler_instance.#perm_name(#(#perm_args),*).await {
                return Err(actix_web::error::ErrorForbidden("Permission denied"));
            }
        }
    } else {
        quote! {}
    };
    
    // 生成handler调用
    let handler_args = generate_function_args(&handler.params, analysis);
    
    // 确定函数签名
    let (route_params, props_param) = if analysis.needs_props {
        let props_name = format_ident!("{}Props", 
            handler_name.to_string()
                .split('_')
                .map(|s| {
                    let mut chars = s.chars();
                    match chars.next() {
                        None => String::new(),
                        Some(f) => f.to_uppercase().collect::<String>() + chars.as_str(),
                    }
                })
                .collect::<String>()
        );
        
        match handler.method {
            HttpMethod::Get => (
                quote! { req: actix_web::HttpRequest },
                quote! {}
            ),
            _ => (
                quote! {},
                quote! { payload: actix_web::web::Json<#props_name> }
            ),
        }
    } else {
        (quote! {}, quote! {})
    };
    
    // 生成路径参数定义，对于引用类型需要转换为所有权类型
    let path_param_defs: Vec<_> = analysis.path_params.iter()
        .map(|(name, ty)| {
            // 检查类型是否为引用类型
            let owned_ty = convert_ref_to_owned(ty);
            quote! { #name: actix_web::web::Path<#owned_ty> }
        })
        .collect();
    
    Ok(quote! {
        async fn #route_func_name(
            __db: actix_web::web::Data<sea_orm::DatabaseConnection>,
            __req: actix_web::HttpRequest,
            #(#path_param_defs,)*
            #route_params
            #props_param
        ) -> Result<actix_web::HttpResponse, actix_web::Error> {
            let handler_instance = #struct_name {
                basic: crate::handler::BasicHandler {
                    db: __db.get_ref().clone(),
                    user_context: __req.extensions().get::<UserAuthCotext>().cloned(),
                    req: __req.clone(),
                },
            };
            
            #path_extractions
            #props_extraction
            #before_calls
            #perm_check
            
            let result = handler_instance.#handler_name(#(#handler_args),*).await
                .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;
            
            Ok(actix_web::HttpResponse::Ok()
                .content_type("application/json")
                .body(serde_json::json!({
                    "code": 0,
                    "data": serde_json::from_str::<serde_json::Value>(&result).unwrap_or(serde_json::Value::String(result.clone()))
                }).to_string()))
        }
    })
}

/// 将引用类型转换为所有权类型（用于 Path 提取）
fn convert_ref_to_owned(ty: &Type) -> TokenStream {
    if let syn::Type::Reference(ref_ty) = ty {
        // 检查是否是 &str
        if let syn::Type::Path(type_path) = ref_ty.elem.as_ref() {
            if type_path.path.is_ident("str") {
                return quote! { String };
            }
        }
        // 对于其他引用类型，使用内部类型
        let inner = &ref_ty.elem;
        quote! { #inner }
    } else {
        quote! { #ty }
    }
}

/// 生成路径参数提取代码
fn generate_path_extractions(path_params: &[(Ident, Type)]) -> TokenStream {
    let extractions: Vec<_> = path_params.iter()
        .map(|(name, _)| {
            quote! {
                let #name = #name.into_inner();
            }
        })
        .collect();
    
    quote! { #(#extractions)* }
}

/// 生成before函数调用链
fn generate_before_calls(
    execution_order: &[String],
    before_funcs: &[BeforeFunction],
    _path_params: &[(Ident, Type)],
    path_vars: &[String],
) -> Result<TokenStream, String> {
    let mut calls = Vec::new();
    let mut available_vars: HashMap<String, Ident> = HashMap::new();
    
    // 调试：检查path_vars
    if path_vars.is_empty() {
        eprintln!("WARNING: path_vars is empty!");
    } else {
        eprintln!("DEBUG: path_vars = {:?}", path_vars);
    }
    
    // 首先添加所有路径变量（这些变量在路径提取后就可用了）
    for path_var in path_vars {
        let ident = syn::Ident::new(path_var, proc_macro2::Span::call_site());
        available_vars.insert(path_var.clone(), ident);
        eprintln!("DEBUG: Added path_var '{}' to available_vars", path_var);
    }
    
    eprintln!("DEBUG: available_vars after adding path_vars: {:?}", available_vars.keys().collect::<Vec<_>>());
    
    for before_name in execution_order {
        let before = before_funcs.iter()
            .find(|b| b.name.to_string() == *before_name)
            .ok_or_else(|| format!("Before function '{}' not found", before_name))?;
        
        let before_ident = &before.name;
        let args = generate_before_args(before, &available_vars)?;
        
        // 根据导出数量生成不同的绑定
        if before.exports.len() == 1 {
            let export = &before.exports[0];
            calls.push(quote! {
                let #export = handler_instance.#before_ident(#(#args),*).await
                    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;
            });
            available_vars.insert(export.to_string(), export.clone());
        } else if before.exports.len() > 1 {
            let exports = &before.exports;
            let tuple_pattern = quote! { (#(#exports),*) };
            calls.push(quote! {
                let #tuple_pattern = handler_instance.#before_ident(#(#args),*).await
                    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;
            });
            for export in exports {
                available_vars.insert(export.to_string(), export.clone());
            }
        }
    }
    
    Ok(quote! { #(#calls)* })
}

/// 生成before函数的参数列表
fn generate_before_args(
    before: &BeforeFunction,
    available_vars: &HashMap<String, Ident>,
) -> Result<Vec<TokenStream>, String> {
    let mut args = Vec::new();
    
    for param in &before.params {
        if param.is_self {
            continue;
        }
        
        let param_name = param.name.to_string();
        let var = available_vars.get(&param_name)
            .ok_or_else(|| {
                let available_keys: Vec<String> = available_vars.keys().cloned().collect();
                format!(
                    "Variable '{}' not available for before function '{}'. Available: {:?}",
                    param_name, before.name, available_keys
                )
            })?;
        
        // 检查参数类型是否为引用类型
        let is_ref_type = matches!(&param.ty, syn::Type::Reference(_));
        
        if is_ref_type {
            args.push(quote! { &#var });
        } else {
            args.push(quote! { #var });
        }
    }
    
    Ok(args)
}

/// 生成函数参数列表
fn generate_function_args(
    params: &[Parameter],
    analysis: &ParameterAnalysis,
) -> Vec<TokenStream> {
    let mut args = Vec::new();
    
    for param in params {
        if param.is_self {
            continue;
        }
        
        let param_name = &param.name;
        let param_str = param_name.to_string();
        
        // 检查参数类型是否为引用类型
        let is_ref_type = matches!(&param.ty, syn::Type::Reference(_));
        
        // 检查参数来源
        if analysis.path_params.iter().any(|(n, _)| n == param_name) {
            // 路径参数：根据目标类型决定是传引用还是值
            if is_ref_type {
                args.push(quote! { &#param_name });
            } else {
                args.push(quote! { #param_name });
            }
        } else if analysis.before_exports.contains_key(&param_str) {
            // before导出：根据目标类型决定是传引用还是值
            if is_ref_type {
                args.push(quote! { &#param_name });
            } else {
                args.push(quote! { #param_name });
            }
        } else {
            // Props字段：如果原始类型是引用，传递引用；否则直接传递（消耗 props）
            if is_ref_type {
                args.push(quote! { &props.#param_name });
            } else {
                args.push(quote! { props.#param_name });
            }
        }
    }
    
    args
}

/// 生成服务注册代码
fn generate_service_registration(
    handler: &HandlerFunction,
    path_template: &str,
) -> TokenStream {
    let route_func_name = format_ident!("__route_{}", handler.name);
    let method_macro = format_ident!("{}", handler.method.as_actix_macro());
    
    quote! {
        .route(#path_template, actix_web::web::#method_macro().to(#route_func_name))
    }
}

/// 生成export_http_service函数
fn generate_export_service(
    struct_name: &Ident,
    base_path: &str,
    service_registrations: &[TokenStream],
) -> TokenStream {
    quote! {
        impl #struct_name {
            pub fn export_http_service() -> actix_web::Scope {
                actix_web::web::scope(#base_path)
                    #(#service_registrations)*
            }
        }
    }
}