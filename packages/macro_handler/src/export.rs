#![allow(unused)]
//! TypeScript API 导出生成器
//!
//! 在编译时收集 handler 信息，并生成 TypeScript 客户端代码

use crate::types::{HandlerFunction, BeforeFunction, PermFunction};
use crate::dependency::compute_execution_order;
use crate::codegen::analyze_parameters;
use std::cell::RefCell;
use std::collections::HashSet;
use std::fs;
use std::path::Path;

/// 存储所有 handler 函数信息
#[derive(Debug, Clone)]
pub struct ExportedHandler {
    /// 完整的 API 路径（如 /api/problem/view）
    pub real_path: String,
    /// 函数名
    pub function_name: String,
    /// HTTP 方法
    pub http_method: String,
    /// 路由模板（如 /{iden}）
    pub route_template: String,
    /// 参数列表（名称, 类型字符串）
    pub params: Vec<(String, String)>,
    /// 路径参数
    pub path_params: Vec<String>,
    /// 返回类型的导出字段列表（名称, 类型字符串）
    pub export_fields: Vec<(String, String)>,
    /// 返回类型名称
    pub return_type_name: String,
    /// 使用的自定义类型名称（需要 import）
    pub used_types: Vec<String>,
}

/// 检查是否为需要导入的自定义类型
fn is_custom_type(ty_name: &str) -> bool {
    // 排除基本类型和内置类型
    !matches!(
        ty_name,
        "number" | "string" | "boolean" | "void" | "null" | "undefined" | "unknown" | "never"
    ) && !ty_name.starts_with('[')  // 排除数组类型表示
       && !ty_name.contains("[]")   // 排除数组后缀
       && !ty_name.contains(" | ")  // 排除联合类型
       && !ty_name.starts_with("Record<") // 排除 Record 类型
}

/// 从类型字符串中提取基础类型名
fn extract_base_type(ty: &str) -> Option<String> {
    let trimmed = ty.trim();

    // 处理数组类型 "TypeName[]"
    if let Some(base) = trimmed.strip_suffix("[]") {
        return extract_base_type(base);
    }

    // 处理可选类型 "TypeName | null"
    if let Some(base) = trimmed.strip_suffix(" | null") {
        return extract_base_type(base);
    }

    // 检查是否是自定义类型
    if is_custom_type(trimmed) && !trimmed.is_empty() {
        Some(trimmed.to_string())
    } else {
        None
    }
}

thread_local! {
    /// 收集所有导出的 handler
    static EXPORTED_HANDLERS: RefCell<Vec<ExportedHandler>> = RefCell::new(Vec::new());
}

/// 从路径模板中提取变量名
fn extract_path_vars(path_template: &str) -> Vec<String> {
    let mut vars = Vec::new();
    let mut in_bracket = false;
    let mut current_var = String::new();

    for ch in path_template.chars() {
        match ch {
            '{' => {
                in_bracket = true;
                current_var.clear();
            }
            '}' => {
                if in_bracket && !current_var.is_empty() {
                    vars.push(current_var.clone());
                }
                in_bracket = false;
            }
            _ if in_bracket => {
                current_var.push(ch);
            }
            _ => {}
        }
    }

    vars
}

/// 将 Rust 类型转换为 TypeScript 类型名称
fn rust_type_to_ts_name(ty: &syn::Type) -> String {
    match ty {
        syn::Type::Path(type_path) => {
            let segments: Vec<String> = type_path
                .path
                .segments
                .iter()
                .map(|s| s.ident.to_string())
                .collect();

            let type_name = segments
                .last()
                .cloned()
                .unwrap_or_else(|| "unknown".to_string());

            // 处理常见类型
            match type_name.as_str() {
                "i8" | "i16" | "i32" | "i64" | "u8" | "u16" | "u32" | "u64" | "f32" | "f64"
                | "isize" | "usize" => "number".to_string(),
                "String" | "str" => "string".to_string(),
                "bool" => "boolean".to_string(),
                "Vec" => {
                    // 处理 Vec<T>
                    if let Some(last_segment) = type_path.path.segments.last() {
                        if let syn::PathArguments::AngleBracketed(args) = &last_segment.arguments {
                            if let Some(syn::GenericArgument::Type(inner_ty)) = args.args.first() {
                                return format!("{}[]", rust_type_to_ts_name(inner_ty));
                            }
                        }
                    }
                    "unknown[]".to_string()
                }
                "Option" => {
                    // 处理 Option<T>
                    if let Some(last_segment) = type_path.path.segments.last() {
                        if let syn::PathArguments::AngleBracketed(args) = &last_segment.arguments {
                            if let Some(syn::GenericArgument::Type(inner_ty)) = args.args.first() {
                                return format!("{} | null", rust_type_to_ts_name(inner_ty));
                            }
                        }
                    }
                    "unknown | null".to_string()
                }
                "HashMap" | "BTreeMap" => "Record<string, unknown>".to_string(),
                // ResultHandler<T> -> 提取 T
                "ResultHandler" => {
                    if let Some(last_segment) = type_path.path.segments.last() {
                        if let syn::PathArguments::AngleBracketed(args) = &last_segment.arguments {
                            if let Some(syn::GenericArgument::Type(inner_ty)) = args.args.first() {
                                return rust_type_to_ts_name(inner_ty);
                            }
                        }
                    }
                    "unknown".to_string()
                }
                // Result<T, E> -> 提取 T
                "Result" => {
                    if let Some(last_segment) = type_path.path.segments.last() {
                        if let syn::PathArguments::AngleBracketed(args) = &last_segment.arguments {
                            if let Some(syn::GenericArgument::Type(inner_ty)) = args.args.first() {
                                return rust_type_to_ts_name(inner_ty);
                            }
                        }
                    }
                    "unknown".to_string()
                }
                // 其他类型直接使用类型名（这些是自定义 struct 名称）
                _ => type_name,
            }
        }
        syn::Type::Reference(ref_ty) => rust_type_to_ts_name(&ref_ty.elem),
        syn::Type::Tuple(tuple_ty) => {
            if tuple_ty.elems.is_empty() {
                "void".to_string()
            } else {
                let inner: Vec<String> = tuple_ty.elems.iter().map(rust_type_to_ts_name).collect();
                format!("[{}]", inner.join(", "))
            }
        }
        _ => "unknown".to_string(),
    }
}

/// 从返回类型中提取元组内的各个类型
fn extract_tuple_types(ty: &syn::Type) -> Vec<String> {
    match ty {
        syn::Type::Path(type_path) => {
            let type_name = type_path.path.segments.last().map(|s| s.ident.to_string());

            // 处理 ResultHandler<T> 或 Result<T, E>
            if matches!(type_name.as_deref(), Some("ResultHandler") | Some("Result")) {
                if let Some(last_segment) = type_path.path.segments.last() {
                    if let syn::PathArguments::AngleBracketed(args) = &last_segment.arguments {
                        if let Some(syn::GenericArgument::Type(inner_ty)) = args.args.first() {
                            return extract_tuple_types(inner_ty);
                        }
                    }
                }
            }
            // 单一类型
            vec![rust_type_to_ts_name(ty)]
        }
        syn::Type::Tuple(tuple_ty) => tuple_ty.elems.iter().map(rust_type_to_ts_name).collect(),
        _ => vec![rust_type_to_ts_name(ty)],
    }
}

/// 从 handler 的属性中解析 export 名称列表
fn parse_export_names(handler: &HandlerFunction) -> Vec<String> {
    let mut names = Vec::new();

    for attr in &handler.attrs {
        if attr.path().is_ident("export") {
            if let Ok(lits) = crate::parser::parse_str_list_from_attr(attr) {
                for lit in lits {
                    if let syn::Lit::Str(s) = lit {
                        names.push(s.value());
                    }
                }
            }
        }
    }

    names
}

/// 生成类型导出信息并收集 handler 信息
pub fn export_func_generate(
    type_real_path: &str,
    handlers: &[HandlerFunction],
    before_funcs: &[BeforeFunction],
    perm_funcs: &[PermFunction],
) {
    let export_dir = env!("EXPORT");

    for handler in handlers {
        let function_name = handler.name.to_string();
        let http_method = handler.method.as_actix_macro().to_string();
        let route_template = handler.path_template.clone();
        let path_params_vec = extract_path_vars(&route_template);

        // 确定需要执行的perm函数
        let perm_func = if let Some(ref perm_name) = handler.perm_func {
            perm_funcs.iter().find(|p| &p.name == perm_name)
        } else {
            perm_funcs.iter().find(|p| p.name == "perm")
        };

        // 计算依赖和执行顺序
        // 这里的逻辑需要与 codegen.rs 中的逻辑保持一致
        let execution_order = match compute_execution_order(handler, perm_func, before_funcs, &path_params_vec) {
            Ok(order) => order,
            Err(e) => {
                eprintln!("cargo:warning=Failed to compute execution order for {}: {}", function_name, e);
                continue;
            }
        };

        // 整合 perm_func 参数到 handler (与 codegen 一致)
        let mut total_handler = handler.clone();
        if let Some(perm_func) = perm_func {
            let mut now_params = std::collections::HashMap::new();
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

        // 分析参数
        let analysis = match analyze_parameters(&total_handler, &path_params_vec, before_funcs, &execution_order) {
            Ok(a) => a,
            Err(e) => {
                eprintln!("cargo:warning=Failed to analyze parameters for {}: {}", function_name, e);
                continue;
            }
        };

        // 构建导出参数列表
        let mut params: Vec<(String, String)> = Vec::new();

        // 1. 先添加路径参数
        for path_param in &path_params_vec {
            // 路径参数默认为 string，或者如果能从 analysis.path_params 找到类型
            let mut param_type = "string".to_string();
            if let Some((_, ty)) = analysis.path_params.iter().find(|(name, _)| name.to_string() == *path_param) {
                param_type = rust_type_to_ts_name(ty);
            }
            params.push((path_param.clone(), param_type));
        }

        // 2. 添加 Props 参数 (非路径参数)
        for (name_ident, ty) in &analysis.props_fields {
            params.push((name_ident.to_string(), rust_type_to_ts_name(ty)));
        }

        // 解析 export 属性获取返回字段名
        let export_names = parse_export_names(handler);

        // 从返回类型中提取各个类型
        let return_types = if let syn::ReturnType::Type(_, ty) = &handler.return_type {
            extract_tuple_types(ty)
        } else {
            vec![]
        };

        // 将 export 名称与类型配对
        let export_fields: Vec<(String, String)> = export_names
            .iter()
            .enumerate()
            .map(|(i, name)| {
                let ty = return_types
                    .get(i)
                    .cloned()
                    .unwrap_or_else(|| "unknown".to_string());
                (name.clone(), ty)
            })
            .collect();

        // 返回类型名称
        let return_type_name = if let syn::ReturnType::Type(_, ty) = &handler.return_type {
            rust_type_to_ts_name(ty)
        } else {
            "void".to_string()
        };

        // 收集使用的自定义类型
        let mut used_types: Vec<String> = Vec::new();
        for (_, ty) in &export_fields {
            if let Some(base_type) = extract_base_type(ty) {
                if !used_types.contains(&base_type) {
                    used_types.push(base_type);
                }
            }
        }
        for (_, ty) in &params {
            if let Some(base_type) = extract_base_type(ty) {
                if !used_types.contains(&base_type) {
                    used_types.push(base_type);
                }
            }
        }

        let exported = ExportedHandler {
            real_path: type_real_path.to_string(),
            function_name,
            http_method,
            route_template,
            params,
            path_params: path_params_vec,
            export_fields,
            return_type_name,
            used_types,
        };

        // 存储到 thread_local
        EXPORTED_HANDLERS.with(|handlers| {
            handlers.borrow_mut().push(exported.clone());
        });

        // 立即生成输出
        generate_output(&exported, export_dir);
    }
}

/// 生成单个 handler 的 TypeScript 代码
fn generate_handler_ts(handler: &ExportedHandler) -> String {
    let template_str = include_str!(concat!("../../../", env!("TP")));
    let header_str = include_str!(concat!("../../../", env!("HP")));

    // 生成函数名（将 rust 风格转换为 camelCase）
    let camel_case_name = to_camel_case(&handler.function_name);

    // 生成参数类型名
    let params_type_name = to_pascal_case(&handler.function_name) + "Params";

    // 生成返回类型名
    let response_type_name = to_pascal_case(&handler.function_name) + "Response";

    // 构建完整 URL
    let full_url = format!("{}{}", handler.real_path, handler.route_template);

    // 将路径参数转换为模板字符串形式
    let route_url = handler
        .route_template
        .replace("{", "${params.")
        .replace("}", "}");

    // 生成参数签名
    let params_signature = if handler.params.is_empty() {
        String::new()
    } else {
        format!("params: {}", params_type_name)
    };

    // 生成 HTTP 调用参数
    let http_args = if handler.params.is_empty() {
        match handler.http_method.as_str() {
            "get" | "delete" => format!("url, undefined"),
            _ => format!("url"),
        }
    } else {
        format!("url, params")
    };

    // 生成参数接口
    let params_interface = if handler.params.is_empty() {
        String::new()
    } else {
        let fields: Vec<String> = handler
            .params
            .iter()
            .map(|(name, ty)| {
                // 路径参数必需，其他可选
                let optional = if handler.path_params.contains(name) {
                    ""
                } else {
                    "?"
                };
                format!("  {}{}: {}", name, optional, ty)
            })
            .collect();

        format!(
            "export interface {} {{\n{}\n}}\n\n",
            params_type_name,
            fields.join("\n")
        )
    };

    // 生成响应接口
    let response_interface = if handler.export_fields.is_empty() {
        format!(
            "export type {} = {}\n\n",
            response_type_name, handler.return_type_name
        )
    } else {
        // 使用 export 名称和对应的类型生成响应接口
        let fields: Vec<String> = handler
            .export_fields
            .iter()
            .map(|(name, ty)| format!("  {}: {}", name, ty))
            .collect();

        format!(
            "export interface {} {{\n{}\n}}\n\n",
            response_type_name,
            fields.join("\n")
        )
    };

    // 生成函数代码
    let function_code = format!(
        r#"/**
 * {} - {} {}
 */
export async function {}({}): Promise<{}> {{
  const url = `{}{}`
  const resp = await {}<{}>({})
  return unwrap<{}>(resp as any)
}}
"#,
        handler.function_name,
        handler.http_method.to_uppercase(),
        full_url,
        camel_case_name,
        params_signature,
        response_type_name,
        handler.real_path,
        route_url,
        handler.http_method,
        response_type_name,
        http_args,
        response_type_name
    );

    format!(
        "{}{}{}",
        params_interface, response_interface, function_code
    )
}

/// 生成输出文件
fn generate_output(handler: &ExportedHandler, export_dir: &str) {
    // 确保导出目录存在
    let export_path = Path::new(export_dir);
    if !export_path.exists() {
        if let Err(e) = fs::create_dir_all(export_path) {
            eprintln!("Failed to create export directory: {}", e);
            return;
        }
    }

    // 生成文件名（基于 real_path）
    let file_name = handler.real_path.trim_start_matches('/').replace('/', "_") + ".ts";

    let file_path = export_path.join(&file_name);

    // 读取现有内容或使用 header
    let header_str = include_str!(concat!("../../../", env!("HP")));
    let existing_content = fs::read_to_string(&file_path).ok();

    // 如果文件不存在，使用空类型列表初始化 header
    let (mut content, mut all_used_types) = if let Some(existing) = existing_content {
        // 从现有文件中提取已导入的类型
        let types = extract_imported_types(&existing);
        (existing, types)
    } else {
        // 初始化时先用空字符串替换，后面会更新
        (header_str.to_string(), Vec::<String>::new())
    };

    // 添加新的类型到导入列表
    for ty in &handler.used_types {
        if !all_used_types.contains(ty) {
            all_used_types.push(ty.clone());
        }
    }

    // 生成新的 handler 代码
    let handler_code = generate_handler_ts(handler);

    // 检查是否已包含此函数
    let function_marker = format!(
        "export async function {}",
        to_camel_case(&handler.function_name)
    );
    if !content.contains(function_marker.as_str()) {
        content = format!("{}\n{}", content, handler_code);
    }

    // 更新类型导入语句
    content = update_type_imports(&content, &all_used_types, header_str);

    // 写入文件
    if let Err(e) = fs::write(&file_path, &content) {
        eprintln!("Failed to write export file: {}", e);
    } else {
        println!(
            "Generated TypeScript API: {}",
            file_path.display()
        );
    }
}

/// 更新文件中的类型导入语句
fn update_type_imports(content: &str, used_types: &[String], _header_template: &str) -> String {
    let mut result = content.to_string();

    // 生成类型导入字符串
    let type_imports_str = if used_types.is_empty() {
        String::new()
    } else {
        used_types.join(", ")
    };

    // 查找并替换 {{type_imports}} 模板变量（用于新文件）
    if result.contains("{{type_imports}}") {
        if type_imports_str.is_empty() {
            // 如果没有类型需要导入，移除整个 import 语句行
            // 逐行处理，保留原有的换行格式
            let mut new_lines = Vec::new();
            for line in result.lines() {
                if !line.contains("{{type_imports}}") {
                    new_lines.push(line);
                }
            }
            result = new_lines.join("\n");
            // 确保文件末尾有换行符
            if !result.ends_with('\n') {
                result.push('\n');
            }
        } else {
            result = result.replace("{{type_imports}}", &type_imports_str);
        }
    } else {
        // 对于已存在的文件，更新 import 语句
        // 精确查找 "import { ... } from '@rmjac/api-declare'" 这一行
        let api_declare_suffix = "} from '@rmjac/api-declare'";

        // 逐行查找包含 api-declare import 的行
        let mut found_import_line = None;
        let mut line_start = 0;
        for line in result.lines() {
            if line.contains("from '@rmjac/api-declare'") && line.trim_start().starts_with("import")
            {
                let line_end = line_start + line.len();
                found_import_line = Some((line_start, line_end));
                break;
            }
            line_start += line.len() + 1; // +1 for newline
        }

        if let Some((start_pos, end_pos)) = found_import_line {
            // 构建新的 import 语句
            let new_import = if type_imports_str.is_empty() {
                String::new()
            } else {
                format!(
                    "import {{ {} }} from '@rmjac/api-declare'",
                    type_imports_str
                )
            };

            // 替换旧的 import 语句
            let before = &result[..start_pos];
            let after = if end_pos < result.len() {
                &result[end_pos..]
            } else {
                ""
            };

            if new_import.is_empty() {
                // 删除这一行，同时处理多余的空行
                let before_trimmed = before.trim_end_matches('\n');
                let after_trimmed = after.trim_start_matches('\n');
                if before_trimmed.is_empty() {
                    result = after_trimmed.to_string();
                } else if after_trimmed.is_empty() {
                    result = format!("{}\n", before_trimmed);
                } else {
                    result = format!("{}\n{}", before_trimmed, after_trimmed);
                }
            } else {
                result = format!("{}{}{}", before, new_import, after);
            }
        } else if !type_imports_str.is_empty() {
            // 如果没有找到现有的 import 语句，但有类型需要导入
            // 在 http import 之后添加
            let http_import_pattern = "from '@/lib/http'";
            if let Some(pos) = result.find(http_import_pattern) {
                // 找到这一行的末尾
                let line_end = result[pos..]
                    .find('\n')
                    .map(|p| pos + p)
                    .unwrap_or(result.len());
                let new_import = format!(
                    "\n\nimport {{ {} }} from '@rmjac/api-declare'",
                    type_imports_str
                );
                result = format!(
                    "{}{}{}",
                    &result[..line_end],
                    new_import,
                    &result[line_end..]
                );
            }
        }
    }

    result
}

/// 从现有文件内容中提取已导入的类型
fn extract_imported_types(content: &str) -> Vec<String> {
    let mut types = Vec::new();

    // 查找 import { ... } from '@rmjac/api-declare' 语句
    for line in content.lines() {
        if line.contains("from '@rmjac/api-declare'") && line.trim_start().starts_with("import") {
            // 提取 { } 中的类型名
            if let Some(start) = line.find('{') {
                if let Some(end) = line.find('}') {
                    let types_str = &line[start + 1..end];
                    for ty in types_str.split(',') {
                        let ty = ty.trim();
                        if !ty.is_empty() {
                            types.push(ty.to_string());
                        }
                    }
                }
            }
            break;
        }
    }

    types
}

/// 将 snake_case 转换为 camelCase
fn to_camel_case(s: &str) -> String {
    let mut result = String::new();
    let mut capitalize_next = false;

    for ch in s.chars() {
        if ch == '_' {
            capitalize_next = true;
        } else if capitalize_next {
            result.extend(ch.to_uppercase());
            capitalize_next = false;
        } else {
            result.push(ch);
        }
    }

    result
}

/// 将 snake_case 转换为 PascalCase
fn to_pascal_case(s: &str) -> String {
    let mut result = String::new();
    let mut capitalize_next = true;

    for ch in s.chars() {
        if ch == '_' {
            capitalize_next = true;
        } else if capitalize_next {
            result.extend(ch.to_uppercase());
            capitalize_next = false;
        } else {
            result.push(ch);
        }
    }

    result
}

/// 生成所有导出（在编译结束时调用）
pub fn generate_all() -> proc_macro2::TokenStream {
    use quote::quote;
    quote! {}
}
