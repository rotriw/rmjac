use proc_macro::TokenStream;
use quote::quote;
use syn::{
    Ident, LitInt, LitStr, Result, Token, Type, braced, bracketed,
    parse::{Parse, ParseStream},
    parse_macro_input,
};

struct OptionServiceInput {
    platform: LitStr,
    options: Vec<Ident>,
    service: Ident,
    language_id: Ident,
    export: ExportStruct,
    default_language: DefaultLanguage,
    export_data: ExportDataFn,
}

struct ExportStruct {
    name: Ident,
    fields: Vec<ExportField>,
}

struct ExportField {
    name: Ident,
    ty: Type,
}

struct DefaultLanguage {
    show_name: Ident,
    language_id: Ident,
    languages: Vec<LanguageEntry>,
}

struct LanguageEntry {
    name: LitStr,
    id: LitInt,
}

struct ExportDataFn {
    func_name: Ident,
}

impl Parse for OptionServiceInput {
    fn parse(input: ParseStream) -> Result<Self> {
        let mut platform = None;
        let mut options = Vec::new();
        let mut service = None;
        let mut language_id = None;
        let mut export = None;
        let mut default_language = None;
        let mut export_data = None;

        while !input.is_empty() {
            let key: Ident = input.parse()?;
            input.parse::<Token![:]>()?;

            match key.to_string().as_str() {
                "platform" => {
                    platform = Some(input.parse()?);
                }
                "options" => {
                    let content;
                    bracketed!(content in input);
                    while !content.is_empty() {
                        options.push(content.parse()?);
                        if !content.is_empty() {
                            content.parse::<Token![,]>()?;
                        }
                    }
                }
                "service" => {
                    service = Some(input.parse()?);
                }
                "language_id" => {
                    language_id = Some(input.parse()?);
                }
                "export" => {
                    let name: Ident = input.parse()?;
                    let content;
                    braced!(content in input);
                    let mut fields = Vec::new();
                    while !content.is_empty() {
                        let field_name: Ident = content.parse()?;
                        content.parse::<Token![:]>()?;
                        let field_ty: Type = content.parse()?;
                        content.parse::<Token![,]>()?;
                        fields.push(ExportField {
                            name: field_name,
                            ty: field_ty,
                        });
                    }
                    export = Some(ExportStruct { name, fields });
                }
                "default_language" => {
                    let _macro_name: Ident = input.parse()?; // list_language
                    input.parse::<Token![!]>()?;
                    let content;
                    braced!(content in input);

                    let show_name: Ident = content.parse()?;
                    let language_id_field: Ident = content.parse()?;
                    content.parse::<Token![,]>()?;

                    let mut languages = Vec::new();
                    while !content.is_empty() {
                        let name: LitStr = content.parse()?;
                        let id: LitInt = content.parse()?;
                        content.parse::<Token![,]>()?;
                        languages.push(LanguageEntry { name, id });
                    }
                    default_language = Some(DefaultLanguage {
                        show_name,
                        language_id: language_id_field,
                        languages,
                    });
                }
                "export_data" => {
                    export_data = Some(ExportDataFn {
                        func_name: input.parse()?,
                    });
                }
                _ => return Err(syn::Error::new(key.span(), "Unknown key")),
            }

            if !input.is_empty() {
                input.parse::<Token![,]>()?;
            }
        }

        Ok(OptionServiceInput {
            platform: platform.ok_or_else(|| syn::Error::new(input.span(), "Missing platform"))?,
            options,
            service: service.ok_or_else(|| syn::Error::new(input.span(), "Missing service"))?,
            language_id: language_id
                .ok_or_else(|| syn::Error::new(input.span(), "Missing language_id"))?,
            export: export.ok_or_else(|| syn::Error::new(input.span(), "Missing export"))?,
            default_language: default_language
                .ok_or_else(|| syn::Error::new(input.span(), "Missing default_language"))?,
            export_data: export_data
                .ok_or_else(|| syn::Error::new(input.span(), "Missing export_data"))?,
        })
    }
}

pub fn option_service_impl(input: TokenStream) -> TokenStream {
    let input = parse_macro_input!(input as OptionServiceInput);

    let _platform = input.platform;
    let options = input.options;
    let service = input.service;
    let language_id = input.language_id;
    let export_name = input.export.name;
    let export_fields = input.export.fields.iter().map(|f| {
        let name = &f.name;
        let ty = &f.ty;
        quote! { pub #name: #ty }
    });

    let default_language_show_name = &input.default_language.show_name;
    let default_language_id_field = &input.default_language.language_id;
    let language_entries = input.default_language.languages.iter().map(|l| {
        let name = &l.name;
        let id = &l.id;
        quote! {
            allowed_language.insert(
                #name.to_string(),
                #language_id {
                    #default_language_id_field: #id,
                    #default_language_show_name: #name,
                },
            );
        }
    });

    let export_data_func = input.export_data.func_name;

    let expanded = quote! {
        #[derive(Clone, Copy)]
        pub struct #language_id {
            pub #default_language_id_field: i64,
            pub #default_language_show_name: &'static str,
        }

        pub struct #service {
            pub allowed_language: HashMap<String, #language_id>,
        }

        pub struct #export_name {
            #(#export_fields,)*
        }

        impl Language for #language_id {
            fn as_any(&self) -> &dyn std::any::Any {
                self
            }

            fn export_allow_compile_options(&self) -> Vec<Box<dyn CompileOption>> {
                vec![
                    #(Box::new(#options),)*
                ]
            }

            fn export_name(&self) -> &'static str {
                self.#default_language_show_name
            }

            fn export_compile_name(&self) -> &'static str {
                "not require"
            }
        }

        impl #language_id {
            fn get_language_id(&self) -> i64 {
                self.#default_language_id_field
            }
        }

        impl CompileOptionService for #service {
            fn get_registered_language(&self) -> Vec<Box<dyn Language>> {
                let mut result: Vec<Box<dyn Language>> = vec![];
                for (_key, value) in self.allowed_language.iter() {
                    result.push(Box::new(value.clone()));
                }
                result
            }
        }

        impl #service {
            pub fn export_data(&self, option: ChoiceOption<#language_id>) -> #export_name {
                #export_data_func(option)
            }
        }

        impl Clone for #service {
            fn clone(&self) -> Self {
                Self {
                    allowed_language: self.allowed_language.clone(),
                }
            }
        }

        pub fn default_compile_service() -> #service {
            let mut allowed_language = HashMap::new();
            #(#language_entries)*
            #service { allowed_language }
        }
    };

    TokenStream::from(expanded)
}
