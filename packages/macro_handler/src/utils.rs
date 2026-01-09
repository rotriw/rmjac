//! 工具函数

use proc_macro2::TokenStream;
use quote::quote;
use syn::{Ident, Type};

/// 判断类型是否为引用
#[allow(dead_code)]
pub fn is_reference_type(ty: &Type) -> bool {
    matches!(ty, Type::Reference(_))
}

/// 判断类型是否为String
#[allow(dead_code)]
pub fn is_string_type(ty: &Type) -> bool {
    if let Type::Path(type_path) = ty {
        if let Some(segment) = type_path.path.segments.last() {
            return segment.ident == "String";
        }
    }
    false
}

/// 判断类型是否为&str
#[allow(dead_code)]
pub fn is_str_ref_type(ty: &Type) -> bool {
    if let Type::Reference(type_ref) = ty {
        if let Type::Path(type_path) = &*type_ref.elem {
            if let Some(segment) = type_path.path.segments.last() {
                return segment.ident == "str";
            }
        }
    }
    false
}

/// 判断类型是否为i64或&i64
#[allow(dead_code)]
pub fn is_i64_type(ty: &Type) -> bool {
    match ty {
        Type::Path(type_path) => {
            if let Some(segment) = type_path.path.segments.last() {
                segment.ident == "i64"
            } else {
                false
            }
        }
        Type::Reference(type_ref) => {
            if let Type::Path(type_path) = &*type_ref.elem {
                if let Some(segment) = type_path.path.segments.last() {
                    return segment.ident == "i64";
                }
            }
            false
        }
        _ => false,
    }
}

/// 生成类型转换代码
#[allow(dead_code)]
pub fn generate_type_conversion(
    var_name: &Ident,
    from_type: &Type,
    to_type: &Type,
) -> Option<TokenStream> {
    // String -> &str
    if is_string_type(from_type) && is_str_ref_type(to_type) {
        return Some(quote! { #var_name.as_str() });
    }

    // String -> i64
    if is_string_type(from_type) && is_i64_type(to_type) {
        return Some(quote! {
            #var_name.parse::<i64>()
                .map_err(|_| format!("Invalid i64 value: {}", #var_name))?
        });
    }

    // &String -> &str
    if is_reference_type(from_type) {
        if let Type::Reference(from_ref) = from_type {
            if is_string_type(&from_ref.elem) && is_str_ref_type(to_type) {
                return Some(quote! { #var_name.as_str() });
            }
        }
    }

    // 值类型转引用
    if !is_reference_type(from_type) && is_reference_type(to_type) {
        return Some(quote! { &#var_name });
    }

    None
}

/// 提取类型的基础名称（去除引用）
#[allow(dead_code)]
pub fn get_base_type_name(ty: &Type) -> String {
    match ty {
        Type::Reference(type_ref) => get_base_type_name(&type_ref.elem),
        Type::Path(type_path) => type_path
            .path
            .segments
            .last()
            .map(|s| s.ident.to_string())
            .unwrap_or_default(),
        _ => String::new(),
    }
}

/// 检查两个类型是否兼容（忽略引用差异）
#[allow(dead_code)]
pub fn types_compatible(ty1: &Type, ty2: &Type) -> bool {
    get_base_type_name(ty1) == get_base_type_name(ty2)
}
