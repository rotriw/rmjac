use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, DeriveInput};

#[proc_macro_derive(Perm, attributes(perm))]
pub fn derive_perm(input: TokenStream) -> TokenStream {
    let input = parse_macro_input!(input as DeriveInput);
    let name = input.ident;
    
    // Parse attributes
    let mut edge_module = None;
    let mut edge_str = None;

    for attr in &input.attrs {
        if attr.path().is_ident("perm") {
            // Syn 2.0 parsing
            let _ = attr.parse_nested_meta(|meta| {
                 if meta.path.is_ident("edge_module") {
                     let value = meta.value()?;
                     let s: syn::LitStr = value.parse()?;
                     edge_module = Some(s.value());
                     Ok(())
                 } else if meta.path.is_ident("edge_str") {
                     let value = meta.value()?;
                     let s: syn::LitStr = value.parse()?;
                     edge_str = Some(s.value());
                     Ok(())
                 } else {
                     Err(meta.error("unsupported property"))
                 }
            });
        }
    }
    
    let db_impl = if let (Some(mod_name), Some(s_name)) = (edge_module, edge_str) {
        let mod_ident = syn::Ident::new(&mod_name, proc_macro2::Span::call_site());
        let db_struct_name = syn::Ident::new(&format!("{}DB", name), proc_macro2::Span::call_site());
        let service_struct_name = syn::Ident::new(&format!("{}PermService", name), proc_macro2::Span::call_site());
        
        quote! {
            pub struct #db_struct_name {
                db: sea_orm::DatabaseConnection,
            }

            impl #db_struct_name {
                pub fn new(db: sea_orm::DatabaseConnection) -> Self {
                    Self { db }
                }
            }

            impl perm_tool::SaveService for #db_struct_name {
                async fn save_path(&mut self, u: i64, v: i64, perm: i64) {
                    use crate::db::entity::edge::#mod_ident::{Entity, ActiveModel, Column};
                    use sea_orm::{EntityTrait, QueryFilter, ActiveModelTrait, Set, ColumnTrait, ActiveValue};
                    
                    let existing = Entity::find()
                        .filter(Column::UNodeId.eq(u))
                        .filter(Column::VNodeId.eq(v))
                        .one(&self.db)
                        .await;

                    match existing {
                        Ok(Some(model)) => {
                            let mut active: ActiveModel = model.into();
                            active.perm = Set(perm);
                            let _ = active.update(&self.db).await;
                        }
                        Ok(None) => {
                            use crate::db::entity::edge::edge::create_edge;
                            if let Ok(edge_info) = create_edge(&self.db, #s_name).await {
                                 let active = ActiveModel {
                                    edge_id: Set(edge_info.edge_id),
                                    u_node_id: Set(u),
                                    v_node_id: Set(v),
                                    perm: Set(perm),
                                };
                                let _ = active.insert(&self.db).await;
                            } else {
                                log::error!("Failed to create edge info for {}", #s_name);
                            }
                        }
                        Err(e) => {
                            log::error!("Failed to query {} edge: {:?}", #s_name, e);
                        }
                    }
                }

                async fn del_path(&mut self, u: i64, v: i64, _perm: i64) {
                    use crate::db::entity::edge::#mod_ident::{Entity, Column};
                    use sea_orm::{EntityTrait, QueryFilter, ColumnTrait};
                     let _ = Entity::delete_many()
                        .filter(Column::UNodeId.eq(u))
                        .filter(Column::VNodeId.eq(v))
                        .exec(&self.db)
                        .await;
                }

                async fn load(&mut self) -> Vec<(i64, i64, i64)> {
                    use crate::db::entity::edge::#mod_ident::{Entity};
                    use sea_orm::EntityTrait;
                    let result = Entity::find().all(&self.db).await;
                    match result {
                        Ok(edges) => edges.into_iter().map(|e| (e.u_node_id, e.v_node_id, e.perm)).collect(),
                        Err(e) => {
                            log::error!("Failed to load {} edges: {:?}", #s_name, e);
                            vec![]
                        }
                    }
                }
            }
            
            pub struct #service_struct_name;

            impl #service_struct_name {
                pub async fn init(db: &sea_orm::DatabaseConnection) {
                    #name::init(#db_struct_name::new(db.clone())).await;
                }

                pub fn verify(u: i64, v: i64, perm: impl Into<i64>) -> bool {
                    #name::verify(u, v, perm)
                }

                pub async fn add(u: i64, v: i64, perm: impl Into<i64>, db: &sea_orm::DatabaseConnection) {
                    #name::add(u, v, perm, #db_struct_name::new(db.clone())).await;
                }
                
                pub async fn del(u: i64, v: i64, perm: impl Into<i64>, db: &sea_orm::DatabaseConnection) {
                    #name::del(u, v, perm, #db_struct_name::new(db.clone())).await;
                }

                pub fn get(u: i64, v: i64) -> i64 {
                    #name::get(u, v)
                }

                pub fn get_allow_u(v: i64, perm: impl Into<i64>) -> Vec<i64> {
                    #name::get_allow_u(v, perm)
                }
                
                pub fn get_allow_v(u: i64, perm: impl Into<i64>) -> Vec<i64> {
                    #name::get_allow_v(u, perm)
                }
            }
        }
    } else {
        quote! {}
    };
    
    let expanded = quote! {
        impl perm_tool::PermCombo<#name> for #name {}

        impl From<#name> for i64 {
            fn from(val: #name) -> Self {
                val as i64
            }
        }
        
        impl std::ops::Add for #name {
            type Output = i64;
            fn add(self, other: Self) -> i64 {
                (self as i64) | (other as i64)
            }
        }

        impl std::ops::Add<i64> for #name {
            type Output = i64;
            fn add(self, other: i64) -> i64 {
                (self as i64) | other
            }
        }
        
        impl std::ops::Add<#name> for i64 {
             type Output = i64;
             fn add(self, other: #name) -> i64 {
                 self | (other as i64)
             }
        }

        impl std::ops::BitOr for #name {
            type Output = i64;
            fn bitor(self, other: Self) -> i64 {
                (self as i64) | (other as i64)
            }
        }

        impl std::ops::BitOr<i64> for #name {
            type Output = i64;
            fn bitor(self, other: i64) -> i64 {
                (self as i64) | other
            }
        }
        
        impl std::ops::BitOr<#name> for i64 {
             type Output = i64;
             fn bitor(self, other: #name) -> i64 {
                 self | (other as i64)
             }
        }
        
        impl #name {
            pub const All: i64 = -1;
            
            fn get_graph() -> &'static std::sync::RwLock<perm_tool::PermGraph> {
                static GRAPH: std::sync::OnceLock<std::sync::RwLock<perm_tool::PermGraph>> = std::sync::OnceLock::new();
                GRAPH.get_or_init(|| std::sync::RwLock::new(perm_tool::PermGraph::new()))
            }
            
            pub async fn add(u: i64, v: i64, perm: impl Into<i64>, mut s: impl perm_tool::SaveService) {
                let p = perm.into();
                let new_perm = {
                    let mut g = Self::get_graph().write().unwrap();
                    g.add(u, v, p);
                    g.get_path(u, v).unwrap_or(p)
                };
                s.save_path(u, v, new_perm).await; 
            }
            
            pub async fn del(u: i64, v: i64, perm: impl Into<i64>, mut s: impl perm_tool::SaveService) {
                let p = perm.into();
                let new_perm = {
                    let mut g = Self::get_graph().write().unwrap();
                    g.remove_perm(u, v, p);
                    g.get_path(u, v).unwrap_or(0)
                };
                
                s.del_path(u, v, 0).await;
                if new_perm != 0 {
                    s.save_path(u, v, new_perm).await;
                }
            }
            
            pub async fn init(mut s: impl perm_tool::SaveService) {
                 let data = s.load().await;
                 let mut g = Self::get_graph().write().unwrap();
                 for (u, v, perm) in data {
                     g.add(u, v, perm);
                 }
            }
            
            pub fn get_allow_u(v: i64, perm: impl Into<i64>) -> Vec<i64> {
                 let p = perm.into();
                 let g = Self::get_graph().read().unwrap();
                 g.get_allow_u(v, p)
            }
            
            pub fn get_allow_v(u: i64, perm: impl Into<i64>) -> Vec<i64> {
                 let p = perm.into();
                 let g = Self::get_graph().read().unwrap();
                 g.get_allow_v(u, p)
            }
            
            pub fn verify(u: i64, v: i64, perm: impl Into<i64>) -> bool {
                let p = perm.into();
                let g = Self::get_graph().read().unwrap();
                g.verify(u, v, p)
            }

            pub fn get(u: i64, v: i64) -> i64 {
                let g = Self::get_graph().read().unwrap();
                g.get_path(u, v).unwrap_or(0)
            }
        }
        
        #db_impl
    };
    TokenStream::from(expanded)
}