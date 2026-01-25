//! 代码生成器

use crate::dependency::compute_execution_order;
use crate::parser::{extract_path_vars, parse_str_list_from_attr};
use crate::types::*;
use proc_macro2::TokenStream;
use quote::{format_ident, quote};
use std::collections::HashMap;
use syn::{Ident, Lit, Type};

/// 生成完整的handler实现
pub fn generate_handler_impl(
    handler_real_path: &str,
    handler_base_path: &str,
    before_funcs: &[BeforeFunction],
    perm_funcs: &[PermFunction],
    handler_funcs: &[HandlerFunction],
) -> Result<TokenStream, String> {
    // 生成每个handler函数的路由处理器
    let mut route_handlers = Vec::new();
    let mut service_registrations = Vec::new();

    for handler in handler_funcs {
        let (handler_impl, service_reg) =
            generate_route_handler(handler, before_funcs, perm_funcs, handler_base_path)?;

        route_handlers.push(handler_impl);
        service_registrations.push(service_reg);
    }

    // 生成export_http_service函数
    let export_service = generate_export_service(handler_base_path, &service_registrations);

    #[cfg(feature = "export_ts_type")]
    let value = crate::export::export_func_generate(handler_real_path, handler_funcs, before_funcs, perm_funcs);

    Ok(quote! {
        #(#route_handlers)*

        #export_service
    })
}

pub fn is_special_path(iden: &str) -> bool {
    match iden {
        "db" | "_db" | "redis" | "_redis" | "store" => true, // store 类别。
        "user_context" => true,                              // 如果需要上下文，也要忽略。
        _ => false,
    }
}

fn handle_special_path(iden: &str, uc_is_option: bool) -> TokenStream {
    match (iden, uc_is_option) {
        ("db", _) | ("_db", _) => quote! { __db },
        ("redis", _) | ("_redis", _) => quote! { &mut __redis },
        ("store", _) => quote! { &mut (__db, &mut __redis) },
        ("user_context", false) => quote! { __user_context.clone() },
        ("user_context", true) => quote! { __login_user_context.clone() },
        _ => quote! {},
    }
}

/// 生成单个路由处理器
fn generate_route_handler(
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
    let execution_order = compute_execution_order(handler, perm_func, before_funcs, &path_vars)?;

    let mut total_handler = handler.clone();
    if let Some(perm_func) = perm_func {
        let mut now_params = HashMap::new();
        for param in &total_handler.params {
            now_params.insert(param.name.clone().to_string(), true);
        }
        for used_param in &perm_func.params {
            if now_params.contains_key(&used_param.name.to_string()) {
                continue;
            }
            total_handler.params.push(used_param.clone());
            now_params.insert(used_param.name.clone().to_string(), true);
        }
    }
    // 分析参数来源
    let mut param_analysis =
        analyze_parameters(&total_handler, &path_vars, before_funcs, &execution_order)?;

    // 确保所有路径变量都在path_params中（即使handler不直接使用它们）
    for path_var in &path_vars {
        if !param_analysis
            .path_params
            .iter()
            .any(|(n, _)| n == path_var)
        {
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
        handler,
        &execution_order,
        before_funcs,
        perm_func,
        &param_analysis,
        &path_vars,
    )?;

    // 生成服务注册代码
    let service_reg = generate_service_registration(handler, path_template);

    let impl_code = quote! {
        #props_struct
        #route_func
    };

    Ok((impl_code, service_reg))
}

/// 参数分析结果
pub struct ParameterAnalysis {
    pub needs_props: bool,
    pub props_fields: Vec<(Ident, Type)>,
    pub path_params: Vec<(Ident, Type)>,
    pub before_exports: HashMap<String, (String, Ident)>, // param_name -> (before_name, export_name)
    /// before 函数需要从 props 获取的参数
    pub before_props_params: HashMap<String, Vec<(Ident, Type)>>, // before_name -> [(param_name, param_type)]
}

/// 分析handler函数的参数来源
pub fn analyze_parameters(
    handler: &HandlerFunction,
    path_vars: &[String],
    before_funcs: &[BeforeFunction],
    execution_order: &[String],
) -> Result<ParameterAnalysis, String> {
    let mut props_fields = Vec::new();
    let mut path_params = Vec::new();
    let mut before_exports = HashMap::new();
    let mut before_props_params: HashMap<String, Vec<(Ident, Type)>> = HashMap::new();

    // 收集所有before函数的导出，按执行顺序累积
    let mut available_exports: HashMap<String, String> = HashMap::new();

    // 首先分析 before 函数的参数需求
    // 按执行顺序遍历，这样前面的 before 函数的导出可以被后面的使用
    for before_name in execution_order {
        if let Some(before) = before_funcs.iter().find(|b| b.name == before_name) {
            // 收集此 before 函数的 from_path 参数
            let from_path_params: std::collections::HashSet<String> =
                before.from_path.iter().map(|i| i.to_string()).collect();

            // 分析此 before 函数需要的参数
            let mut this_before_props = Vec::new();
            for param in &before.params {
                if param.is_self {
                    continue;
                }

                let param_name = param.name.to_string();

                // 跳过特殊参数
                if is_special_path(&param_name) {
                    continue;
                }

                // 如果参数在 from_path 中，来自路径变量
                if from_path_params.contains(&param_name) {
                    continue;
                }

                // 如果参数在路径变量中
                if path_vars.contains(&param_name) {
                    continue;
                }

                // 如果参数来自之前的 before 函数的导出
                if available_exports.contains_key(&param_name) {
                    continue;
                }

                // 否则需要从 props 获取
                this_before_props.push((param.name.clone(), param.ty.clone()));

                // 同时加入到总的 props_fields 中（避免重复）
                if !props_fields.iter().any(|(n, _)| n == &param.name) {
                    props_fields.push((param.name.clone(), param.ty.clone()));
                }
            }

            if !this_before_props.is_empty() {
                before_props_params.insert(before_name.clone(), this_before_props);
            }

            // 此 before 函数执行后，将其导出加入可用变量
            for export in &before.exports {
                available_exports.insert(export.to_string(), before_name.clone());
            }
        }
    }

    // 分析 handler 函数的参数
    for param in &handler.params {
        if param.is_self {
            continue;
        }

        let param_name = param.name.to_string();

        if is_special_path(&param_name) {
            continue;
        }

        // 检查是否为路径参数
        if path_vars.contains(&param_name) {
            if !path_params.iter().any(|(n, _)| n == &param.name) {
                path_params.push((param.name.clone(), param.ty.clone()));
            }
        }
        // 检查是否来自before导出
        else if let Some(before_name) = available_exports.get(&param_name) {
            before_exports.insert(
                param_name.clone(),
                (before_name.clone(), param.name.clone()),
            );
        }
        // 否则需要从Props获取
        else {
            // 避免重复添加（可能已经被 before 函数添加过）
            if !props_fields.iter().any(|(n, _)| n == &param.name) {
                props_fields.push((param.name.clone(), param.ty.clone()));
            }
        }
    }

    Ok(ParameterAnalysis {
        needs_props: !props_fields.is_empty(),
        props_fields,
        path_params,
        before_exports,
        before_props_params,
    })
}

/// 生成Props结构体
fn generate_props_struct(
    handler: &HandlerFunction,
    analysis: &ParameterAnalysis,
) -> Result<TokenStream, String> {
    let handler_name = &handler.name;
    let props_name = format_ident!(
        "{}Props",
        handler_name
            .to_string()
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
    let fields: Vec<_> = analysis
        .props_fields
        .iter()
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
    handler: &HandlerFunction,
    execution_order: &[String],
    before_funcs: &[BeforeFunction],
    perm_func: Option<&PermFunction>,
    analysis: &ParameterAnalysis,
    path_vars: &[String],
) -> Result<TokenStream, String> {
    let handler_name = &handler.name;
    let route_func_name = format_ident!("__route_{}", handler_name);

    let require_login = 'scope: {
        for func in before_funcs {
            if func.require_login {
                break 'scope true;
            }
        }
        for func in perm_func {
            if func.require_login {
                break 'scope true;
            }
        }
        handler.require_login
    };

    // 生成路径参数提取
    let path_extractions = generate_path_extractions(&analysis.path_params);

    // 生成Props提取（如果需要）
    let props_extraction = if analysis.needs_props {
        let props_name = format_ident!(
            "{}Props",
            handler_name
                .to_string()
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
        analysis,
    )?;

    // 生成权限检查
    let perm_check = if let Some(perm) = perm_func {
        let perm_name = &perm.name;
        let perm_args = generate_function_args(&perm.params, analysis);

        quote! {
            if !#perm_name(#(#perm_args),*).await {
                Err(crate::handler::HttpError::HandlerError(crate::handler::HandlerError::PermissionDenied))?;
            }
        }
    } else {
        quote! {}
    };

    // 生成handler调用
    let handler_args = generate_function_args(&handler.params, analysis);

    // 确定函数签名
    let (route_params, props_param) = if analysis.needs_props {
        let props_name = format_ident!(
            "{}Props",
            handler_name
                .to_string()
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
            HttpMethod::Get => (quote! { req: actix_web::HttpRequest }, quote! {}),
            _ => (
                quote! {},
                quote! { payload: actix_web::web::Json<#props_name> },
            ),
        }
    } else {
        (quote! {}, quote! {})
    };

    // 生成路径参数定义，对于引用类型需要转换为所有权类型
    let path_param_defs: Vec<_> = analysis
        .path_params
        .iter()
        .map(|(name, ty)| {
            // 检查类型是否为引用类型
            let owned_ty = convert_ref_to_owned(ty);
            quote! { #name: actix_web::web::Path<#owned_ty> }
        })
        .collect();

    let login_check = if require_login {
        quote! {
            let __user_context = __req.extensions().get::<UserAuthCotext>().cloned();
            if __user_context.is_none() {
                Err(crate::handler::HttpError::HandlerError(crate::handler::HandlerError::PermissionDenied))?;
            }
            let __login_user_context = __user_context.clone().unwrap();
        }
    } else {
        quote! {
            let __user_context = __req.extensions().get::<UserAuthCotext>().cloned();
        }
    };

    // 解析最后的输出内容。需要构造一个Json。
    let export_list = &handler.attrs;
    let mut json_value = Vec::new();
    for iden in export_list {
        if iden.path().is_ident("export") {
            let export_list = parse_str_list_from_attr(iden);

            if let Ok(export_list) = export_list {
                for lit in export_list {
                    if let Lit::Str(s) = lit {
                        let ls = json_value.len();
                        let nt = syn::Index::from(ls);

                        json_value.push(quote! {
                            #s: result.#nt,
                        });
                    }
                }
            }
        }
    }

    if json_value.len() == 1 {
        json_value = Vec::new();
        for iden in export_list {
            if iden.path().is_ident("export") {
                let export_list = parse_str_list_from_attr(iden);

                if let Ok(export_list) = export_list {
                    for lit in export_list {
                        if let Lit::Str(s) = lit {
                            let ls = json_value.len();
                            json_value.push(quote! {
                                #s: result,
                            });
                        }
                    }
                }
            }
        }
    }

    Ok(quote! {
        #[allow(dead_code, unused)]
        async fn #route_func_name(
            __db_actix: actix_web::web::Data<sea_orm::DatabaseConnection>,
            __req: actix_web::HttpRequest,
            #(#path_param_defs,)*
            #route_params
            #props_param
        ) -> crate::handler::ResultHandler<actix_web::HttpResponse> {
            use actix_web::HttpMessage;

            let __db = __db_actix.get_ref();
            let mut __redis = rmjac_core::utils::get_redis_connection();

            #login_check

            #path_extractions
            #props_extraction
            #before_calls
            #perm_check





            let result = #handler_name(#(#handler_args),*).await?;

            Ok(actix_web::HttpResponse::Ok()
                .content_type("application/json")
                .body(Json! {
                    "code": 0,
                    #(#json_value)*

                }))
        }
    })
}

/// 将引用类型转换为所有权类型（用于 Path 提取）
pub fn convert_ref_to_owned(ty: &Type) -> TokenStream {
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
    let extractions: Vec<_> = path_params
        .iter()
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
    analysis: &ParameterAnalysis,
) -> Result<TokenStream, String> {
    let mut calls = Vec::new();
    let mut available_vars: HashMap<String, Ident> = HashMap::new();
    // 首先添加所有路径变量（这些变量在路径提取后就可用了）
    for path_var in path_vars {
        let ident = syn::Ident::new(path_var, proc_macro2::Span::call_site());
        available_vars.insert(path_var.clone(), ident);
    }
    for before_name in execution_order {
        let before = before_funcs
            .iter()
            .find(|b| b.name == before_name)
            .ok_or_else(|| format!("Before function '{}' not found", before_name))?;

        let before_ident = &before.name;

        // 获取此 before 函数需要从 props 获取的参数
        let props_params = analysis.before_props_params.get(before_name);
        let args = generate_before_args(before, &available_vars, props_params)?;

        // 根据导出数量生成不同的绑定
        if before.exports.len() == 1 {
            let export = &before.exports[0];
            calls.push(quote! {
                let #export = #before_ident(#(#args),*).await
                    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;
            });
            available_vars.insert(export.to_string(), export.clone());
        } else if before.exports.len() > 1 {
            let exports = &before.exports;
            let tuple_pattern = quote! { (#(#exports),*) };
            calls.push(quote! {
                let #tuple_pattern = #before_ident(#(#args),*).await
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
    props_params: Option<&Vec<(Ident, Type)>>,
) -> Result<Vec<TokenStream>, String> {
    let mut args = Vec::new();

    // 收集需要从 props 获取的参数名
    let props_param_names: std::collections::HashSet<String> = props_params
        .map(|ps| ps.iter().map(|(n, _)| n.to_string()).collect())
        .unwrap_or_default();

    for param in &before.params {
        if param.is_self {
            continue;
        }

        let param_name = param.name.to_string();
        let param_ident = &param.name;

        if is_special_path(&param_name) {
            let uc_is_option = before.require_login;
            let special_arg = handle_special_path(&param_name, uc_is_option);
            args.push(special_arg);
            continue;
        }

        // 检查参数类型是否为引用类型
        let is_ref_type = matches!(&param.ty, syn::Type::Reference(_));

        // 首先检查是否需要从 props 获取
        if props_param_names.contains(&param_name) {
            if is_ref_type {
                args.push(quote! { &props.#param_ident });
            } else {
                args.push(quote! { props.#param_ident.clone() });
            }
            continue;
        }

        // 否则从 available_vars 获取
        let var = available_vars.get(&param_name).ok_or_else(|| {
            let available_keys: Vec<String> = available_vars.keys().cloned().collect();
            format!(
                "Variable '{}' not available for before function '{}'. Available: {:?}, Props: {:?}",
                param_name, before.name, available_keys, props_param_names
            )
        })?;

        if is_ref_type {
            args.push(quote! { &#var });
        } else {
            args.push(quote! { #var });
        }
    }

    Ok(args)
}

/// 生成函数参数列表
fn generate_function_args(params: &[Parameter], analysis: &ParameterAnalysis) -> Vec<TokenStream> {
    let mut args = Vec::new();

    for param in params {
        if param.is_self {
            continue;
        }

        let param_name = &param.name;
        let param_str = param_name.to_string();
        if is_special_path(&param_str) {
            let uc_is_option = if let syn::Type::Path(ld) = &param.ty
                && ld.path.segments.first().unwrap().ident == "Option"
            {
                true
            } else {
                false
            };
            let special_arg = handle_special_path(&param_str, !uc_is_option);
            args.push(special_arg);
            continue;
        }
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
fn generate_service_registration(handler: &HandlerFunction, path_template: &str) -> TokenStream {
    let route_func_name = format_ident!("__route_{}", handler.name);
    let method_macro = format_ident!("{}", handler.method.as_actix_macro());

    quote! {
        .route(#path_template, actix_web::web::#method_macro().to(#route_func_name))
    }
}

/// 生成export_http_service函数
fn generate_export_service(base_path: &str, service_registrations: &[TokenStream]) -> TokenStream {
    quote! {
        pub fn export_http_service() -> actix_web::Scope {
            actix_web::web::scope(#base_path)
                #(#service_registrations)*
        }
    }
}
