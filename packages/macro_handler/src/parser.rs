//! 属性和函数解析器

use syn::{ItemStruct, ItemImpl, ImplItem, ImplItemFn, Attribute, Lit};
use crate::types::*;

/// 解析handler结构体上的属性
pub fn parse_handler_struct(item: &ItemStruct) -> Result<HandlerStruct, syn::Error> {
    let name = item.ident.clone();
    let mut base_path = String::new();
    
    for attr in &item.attrs {
        if attr.path().is_ident("handler") {
            base_path = parse_path_from_attr(attr)?;
        }
    }
    
    if base_path.is_empty() {
        return Err(syn::Error::new_spanned(
            item,
            "handler struct must have #[handler(path=\"...\")] attribute"
        ));
    }
    
    Ok(HandlerStruct {
        name,
        base_path,
        attrs: item.attrs.clone(),
    })
}

/// 解析结果类型
pub type ParseResult = (Vec<BeforeFunction>, Vec<PermFunction>, Vec<HandlerFunction>);

/// 解析impl块中的所有函数
pub fn parse_impl_block(
    impl_block: &ItemImpl,
) -> Result<ParseResult, syn::Error> {
    let mut before_funcs = Vec::new();
    let mut perm_funcs = Vec::new();
    let mut handler_funcs = Vec::new();
    
    for item in &impl_block.items {
        if let ImplItem::Fn(method) = item {
            let func_name = method.sig.ident.to_string();
            
            // 检查是否为handler函数
            if has_handler_attr(&method.attrs) {
                handler_funcs.push(parse_handler_function(method)?);
            }
            // 检查是否为before函数
            else if func_name.starts_with("before_") || has_from_path_attr(&method.attrs) {
                before_funcs.push(parse_before_function(method)?);
            }
            // 检查是否为perm函数
            else if has_perm_attr(&method.attrs) {
                perm_funcs.push(parse_perm_function(method)?);
            }
        }
    }
    
    Ok((before_funcs, perm_funcs, handler_funcs))
}

/// 解析before函数
fn parse_before_function(method: &ImplItemFn) -> Result<BeforeFunction, syn::Error> {
    let name = method.sig.ident.clone();
    let params: Vec<Parameter> = method.sig.inputs.iter()
        .filter_map(Parameter::from_fn_arg)
        .collect();
    
    let mut from_path = Vec::new();
    let mut exports = Vec::new();
    
    for attr in &method.attrs {
        if attr.path().is_ident("from_path") {
            from_path = parse_ident_list_from_attr(attr)?;
        } else if attr.path().is_ident("export") {
            exports = parse_ident_list_from_attr(attr)?;
        }
    }
    
    Ok(BeforeFunction {
        name,
        from_path,
        exports,
        params,
        return_type: method.sig.output.clone(),
        attrs: method.attrs.clone(),
    })
}

/// 解析perm函数
fn parse_perm_function(method: &ImplItemFn) -> Result<PermFunction, syn::Error> {
    let name = method.sig.ident.clone();
    let params: Vec<Parameter> = method.sig.inputs.iter()
        .filter_map(Parameter::from_fn_arg)
        .collect();
    
    Ok(PermFunction {
        name,
        params,
        attrs: method.attrs.clone(),
    })
}

/// 解析handler函数
fn parse_handler_function(method: &ImplItemFn) -> Result<HandlerFunction, syn::Error> {
    let name = method.sig.ident.clone();
    let func_name_str = name.to_string();
    
    // 从函数名推断HTTP方法
    let method_type = HttpMethod::from_function_name(&func_name_str)
        .ok_or_else(|| syn::Error::new_spanned(
            &name,
            format!("Cannot infer HTTP method from function name '{}'. Use get_*, post_*, put_*, delete_*, or patch_* prefix", func_name_str)
        ))?;
    
    let params: Vec<Parameter> = method.sig.inputs.iter()
        .filter_map(Parameter::from_fn_arg)
        .collect();
    
    let mut path_template = String::new();
    let mut before_funcs = None;
    let mut perm_func = None;
    
    for attr in &method.attrs {
        if attr.path().is_ident("route") {
            path_template = parse_path_from_attr(attr)?;
        } else if attr.path().is_ident("before") {
            before_funcs = Some(parse_ident_list_from_attr(attr)?);
        } else if attr.path().is_ident("perm") {
            let idents = parse_ident_list_from_attr(attr)?;
            if let Some(first) = idents.into_iter().next() {
                perm_func = Some(first);
            }
        }
    }
    
    // 如果没有指定path，从函数名生成
    if path_template.is_empty() {
        // 移除HTTP方法前缀
        let path_part = func_name_str
            .strip_prefix(&format!("{}_", method_type.as_actix_macro()))
            .unwrap_or(&func_name_str);
        path_template = path_part.to_string();
    }
    
    Ok(HandlerFunction {
        name,
        method: method_type,
        path_template,
        before_funcs,
        perm_func,
        params,
        return_type: method.sig.output.clone(),
        attrs: method.attrs.clone(),
    })
}

/// 从属性中解析path字符串
fn parse_path_from_attr(attr: &Attribute) -> Result<String, syn::Error> {
    attr.parse_args_with(|input: syn::parse::ParseStream| {
        let lit: Lit = input.parse()?;
        if let Lit::Str(s) = lit {
            Ok(s.value())
        } else {
            Err(syn::Error::new_spanned(lit, "expected string literal"))
        }
    })
}

/// 从属性中解析标识符列表
fn parse_ident_list_from_attr(attr: &Attribute) -> Result<Vec<syn::Ident>, syn::Error> {
    let mut idents = Vec::new();
    
    attr.parse_args_with(|input: syn::parse::ParseStream| {
        while !input.is_empty() {
            let ident: syn::Ident = input.parse()?;
            idents.push(ident);
            
            if input.peek(syn::Token![,]) {
                let _: syn::Token![,] = input.parse()?;
            }
        }
        Ok(())
    })?;
    
    Ok(idents)
}

/// 检查是否有handler属性
fn has_handler_attr(attrs: &[Attribute]) -> bool {
    attrs.iter().any(|attr| attr.path().is_ident("handler"))
}

/// 检查是否有from_path属性
fn has_from_path_attr(attrs: &[Attribute]) -> bool {
    attrs.iter().any(|attr| attr.path().is_ident("from_path"))
}

/// 检查是否有perm属性
fn has_perm_attr(attrs: &[Attribute]) -> bool {
    attrs.iter().any(|attr| attr.path().is_ident("perm"))
}

/// 从路径模板中提取变量名
pub fn extract_path_vars(path_template: &str) -> Vec<String> {
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