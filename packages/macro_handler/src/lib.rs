extern crate proc_macro;

use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, DeriveInput, FieldsNamed};

#[proc_macro_derive(BasicHandler)]
pub fn derive_basic_handler(input: TokenStream) -> TokenStream {
    let input = parse_macro_input!(input as DeriveInput);
    let name = &input.ident;

    // 从结构体字段中提取信息
    let fields = if let syn::Data::Struct(syn::DataStruct {
        fields: syn::Fields::Named(FieldsNamed { named, .. }),
        ..
    }) = input.data
    {
        named
    } else {
        panic!("BasicHandler can only be derived for structs with named fields");
    };

    // 枚举所有字段并为它们生成初始化代码
    let mut field_inits = Vec::new();

    for field in &fields {
        if let Some(ident) = &field.ident {
            let field_name = ident.to_string();
            let field_ident = ident.clone();

            // 为每个字段生成初始化代码
            let init = if field_name.contains("tools") {
                quote! { #field_ident: crate::handler::entry::DefaultTools {
                    db: req.app_data::<actix_web::web::Data<sea_orm::DatabaseConnection>>()
                        .expect("Database connection not found in app data")
                        .clone(),
                } }
            } else if field_name.contains("user_context") {
                quote! { #field_ident: user_context }
            } else if field_name.contains("req") || field_name.contains("request") {
                quote! { #field_ident: req }
            } else {
                // 其他字段设为 None
                quote! { #field_ident: None }
            };

            field_inits.push(init);
        }
    }

    let expanded = quote! {
        impl #name {
            pub fn new(
                tools: crate::handler::entry::DefaultTools,
                user_context: Option<crate::utils::perm::UserAuthCotext>,
                req: actix_web::HttpRequest
            ) -> Self {
                Self {
                    #(#field_inits),*
                }
            }
        }

        impl crate::handler::entry::InitHandler for #name {
            fn create_with_user_context(
                context: Option<crate::utils::perm::UserAuthCotext>,
                req: actix_web::HttpRequest
            ) -> Self {
                Self::new(
                    crate::handler::entry::DefaultTools {
                        db: req.app_data::<actix_web::web::Data<sea_orm::DatabaseConnection>>()
                            .expect("Database connection not found in app data")
                            .clone(),
                    },
                    context,
                    req
                )
            }
        }

        impl crate::handler::entry::DefaultHandler for #name {}
    };

    TokenStream::from(expanded)
}