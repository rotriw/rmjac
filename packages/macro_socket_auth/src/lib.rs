extern crate proc_macro;

use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, ItemFn};

#[proc_macro_attribute]
pub fn auth_socket_connect(_attr: TokenStream, item: TokenStream) -> TokenStream {
    let input = parse_macro_input!(item as ItemFn);
    let func_name = &input.sig.ident;
    let func_args = &input.sig.inputs;
    let func_body = &input.block;
    let func_return = &input.sig.output;

    let expanded = quote! {
        pub async fn #func_name(#func_args) #func_return {
            let has_permission = check_auth(socket.clone());
            if !has_permission {
                return ;
            }

            #func_body
        }
    };

    TokenStream::from(expanded)
}