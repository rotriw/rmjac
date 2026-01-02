use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, Attribute, DeriveInput, Expr, Lit, Meta};

#[proc_macro_derive(Node)]
pub fn derive_node(input: TokenStream) -> TokenStream {
    let input = parse_macro_input!(input as DeriveInput);
    let name = &input.ident;
    let node_name = proc_macro2::Literal::string(&name.to_string());
    let expanded = quote! {
        impl Node<ActiveModel, Model, Entity> for #name {
            fn get_node_id(&self) -> i64 {
                self.node_id
            }
            fn get_node_id_column() -> <<ActiveModel as sea_orm::ActiveModelTrait>::Entity as EntityTrait>::Column {
                Column::NodeId
            }
            fn get_node_type() -> &'static str {
                #node_name
            }
        }
    };
    TokenStream::from(expanded)
}

#[proc_macro_derive(NodeRaw, attributes(node_raw))]
pub fn derive_node_raw(input: TokenStream) -> TokenStream {
    let input = parse_macro_input!(input as DeriveInput);
    let name = &input.ident;
    let node_type = extract_node_type(&input.attrs, &name.to_string());
    let uname = name.clone();
    let uname = uname.to_string();
    let uname = uname[..uname.len() - 3].to_string();
    let uname = proc_macro2::Ident::new(&uname, name.span());
    let node_type_literal = proc_macro2::Literal::string(&node_type);
    let expanded = quote! {
        impl NodeRaw<#uname, Model, ActiveModel> for #name {
            fn get_node_type(&self) -> &str {
                #node_type_literal
            }
            fn get_node_id_column(&self) -> <<ActiveModel as sea_orm::ActiveModelTrait>::Entity as sea_orm::EntityTrait>::Column{
                Column::NodeId
            }
        }
    };
    TokenStream::from(expanded)
}

fn extract_node_type(attrs: &[Attribute], default_name: &str) -> String {
    for attr in attrs {
        if attr.path().is_ident("node_raw") {
            let meta = attr.meta.clone();
            #[allow(clippy::single_match)]
            match meta {
                Meta::List(meta_list) => {
                    let tokens = meta_list.tokens;
                    let parsed: Result<syn::ExprAssign, _> = syn::parse2(tokens);
                    if let Ok(assign) = parsed
                        && let Expr::Path(path) = &*assign.left
                        && path.path.is_ident("node_type")
                        && let Expr::Lit(expr_lit) = &*assign.right
                        && let Lit::Str(lit_str) = &expr_lit.lit {
                            return lit_str.value();
                    }
                }
                _ => {}
            }
        }
    }
    default_name.to_lowercase()
}
