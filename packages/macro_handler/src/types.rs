#![allow(unused)]
//! 核心数据类型定义

use std::collections::{HashMap, HashSet};
use syn::{Attribute, FnArg, Ident, ReturnType, Type};

/// HTTP方法类型
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum HttpMethod {
    Get,
    Post,
    Put,
    Delete,
    Patch,
}

impl HttpMethod {
    /// 从函数名推断HTTP方法
    pub fn from_function_name(name: &str) -> Option<Self> {
        if name.starts_with("get_") {
            Some(HttpMethod::Get)
        } else if name.starts_with("post_") {
            Some(HttpMethod::Post)
        } else if name.starts_with("put_") {
            Some(HttpMethod::Put)
        } else if name.starts_with("delete_") {
            Some(HttpMethod::Delete)
        } else if name.starts_with("patch_") {
            Some(HttpMethod::Patch)
        } else {
            None
        }
    }

    /// 获取actix-web宏名称
    pub fn as_actix_macro(&self) -> &str {
        match self {
            HttpMethod::Get => "get",
            HttpMethod::Post => "post",
            HttpMethod::Put => "put",
            HttpMethod::Delete => "delete",
            HttpMethod::Patch => "patch",
        }
    }
}

/// Handler结构体元数据
#[derive(Debug)]
pub struct HandlerStruct {
    pub name: Ident,
    pub base_path: String,
    #[allow(dead_code)]
    pub attrs: Vec<Attribute>,
}

/// Before函数元数据
#[derive(Debug, Clone)]
pub struct BeforeFunction {
    pub name: Ident,
    #[allow(dead_code)]
    pub from_path: Vec<Ident>,
    pub exports: Vec<Ident>,
    pub require_login: bool,
    pub params: Vec<Parameter>,
    #[allow(dead_code)]
    pub return_type: ReturnType,
    #[allow(dead_code)]
    pub attrs: Vec<Attribute>,
}

/// 权限检查函数元数据
#[derive(Debug, Clone)]
pub struct PermFunction {
    pub name: Ident,
    pub require_login: bool,
    pub params: Vec<Parameter>,
    #[allow(dead_code)]
    pub attrs: Vec<Attribute>,
}

/// Handler函数元数据
#[derive(Debug, Clone)]
pub struct HandlerFunction {
    pub name: Ident,
    pub method: HttpMethod,
    pub path_template: String,
    pub require_login: bool,
    pub before_funcs: Option<Vec<Ident>>,
    pub perm_func: Option<Ident>,
    pub params: Vec<Parameter>,
    #[allow(dead_code)]
    pub return_type: ReturnType,
    #[allow(dead_code)]
    pub attrs: Vec<Attribute>,
}

/// 函数参数
#[derive(Debug, Clone)]
pub struct Parameter {
    pub name: Ident,
    pub ty: Type,
    pub is_self: bool,
}

impl Parameter {
    /// 从syn::FnArg提取参数信息
    pub fn from_fn_arg(arg: &FnArg) -> Option<Self> {
        match arg {
            FnArg::Receiver(_) => Some(Parameter {
                name: Ident::new("self", proc_macro2::Span::call_site()),
                ty: syn::parse_quote!(Self),
                is_self: true,
            }),
            FnArg::Typed(pat_type) => {
                if let syn::Pat::Ident(pat_ident) = &*pat_type.pat {
                    Some(Parameter {
                        name: pat_ident.ident.clone(),
                        ty: (*pat_type.ty).clone(),
                        is_self: false,
                    })
                } else {
                    None
                }
            }
        }
    }
}

/// 参数来源
#[derive(Debug, Clone, PartialEq)]
#[allow(dead_code)]
pub enum ParameterSource {
    /// 来自路径参数
    Path { var_name: String },
    /// 来自Before函数导出
    BeforeExport {
        before_func: Ident,
        export_name: Ident,
    },
    /// 来自请求体
    RequestBody { field_name: Ident },
    /// 来自查询参数
    QueryParam { param_name: String },
}

/// 参数信息（包含来源和类型转换）
#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct ParameterInfo {
    pub name: Ident,
    pub ty: Type,
    pub source: ParameterSource,
    pub needs_conversion: Option<TypeConversion>,
}

/// 类型转换方式
#[derive(Debug, Clone, PartialEq)]
#[allow(dead_code)]
pub enum TypeConversion {
    /// String转i64
    StringToI64,
    /// String转&str
    StringToRef,
    /// 值转引用
    ValueToRef,
    /// 无需转换
    None,
}

/// 依赖图
#[derive(Debug)]
pub struct DependencyGraph {
    /// before函数名 -> 该函数的节点信息
    pub nodes: HashMap<String, DependencyNode>,
}

/// 依赖图节点
#[derive(Debug, Clone)]
pub struct DependencyNode {
    /// 导出的变量名列表
    pub exports: Vec<Ident>,
    /// 依赖哪些其他before函数（通过它们的导出）
    pub depends_on: HashSet<String>,
}

impl DependencyGraph {
    pub fn new() -> Self {
        DependencyGraph {
            nodes: HashMap::new(),
        }
    }

    /// 添加节点
    pub fn add_node(&mut self, name: String, exports: Vec<Ident>, depends_on: HashSet<String>) {
        self.nodes.insert(
            name,
            DependencyNode {
                exports,
                depends_on,
            },
        );
    }

    /// 查找提供指定导出的before函数
    pub fn find_provider(&self, export_name: &str) -> Option<&str> {
        for (before_name, node) in &self.nodes {
            if node.exports.iter().any(|e| e == export_name) {
                return Some(before_name);
            }
        }
        None
    }
}
