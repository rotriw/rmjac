use proc_macro::TokenStream;
use quote::{ToTokens, quote};
use syn::{ItemFn, parse_macro_input};

#[proc_macro_attribute]
pub fn perm(attr: TokenStream, item: TokenStream) -> TokenStream {
    let input = parse_macro_input!(item as ItemFn);
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
