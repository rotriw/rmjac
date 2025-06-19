use proc_macro::TokenStream;
use quote::{quote, ToTokens};
use syn::{
    braced,
    parse::{Parse, ParseStream, Result},
    parse_macro_input, Ident, Path, Token,
};

struct TableDef {
    table_name: Path,
    columns: Vec<Column>,
}

impl Parse for TableDef {
    fn parse(input: ParseStream) -> Result<Self> {
        let table_name: Path = input.parse()?;
        input.parse::<Token![,]>()?;

        let content;
        braced!(content in input);

        let mut columns = Vec::new();
        while !content.is_empty() {
            let column: Column = content.parse()?;
            columns.push(column);
        }

        Ok(TableDef {
            table_name,
            columns,
        })
    }
}

struct Column {
    name: Ident,
    type_name: Ident,
    modifiers: Vec<Ident>,
}

impl Parse for Column {
    fn parse(input: ParseStream) -> Result<Self> {
        let name: Ident = input.parse()?;

        input.parse::<Token![:]>()?;
        let type_name: Ident = input.parse()?;
        let mut modifiers = Vec::new();
        while !input.is_empty() && !input.peek(Token![,]) {
            modifiers.push(input.parse()?);
        }
        let _ = input.parse::<Token![,]>();
        Ok(Column {
            name,
            type_name,
            modifiers,
        })
    }
}

impl Column {
    fn with_table(&self, table_name: &Path) -> ColumnWithTable {
        ColumnWithTable {
            table_name: table_name.clone(),
            column: self,
        }
    }
}

struct ColumnWithTable<'a> {
    table_name: Path,
    column: &'a Column,
}

impl<'a> ToTokens for ColumnWithTable<'a> {
    fn to_tokens(&self, tokens: &mut proc_macro2::TokenStream) {
        let table_name = &self.table_name;
        let name = &self.column.name;
        let type_name = &self.column.type_name;
        let modifiers = &self.column.modifiers;

        let col_def = quote! {
            .col(ColumnDef::new(#table_name::#name).#type_name() #(.#modifiers())*)
        };

        tokens.extend(col_def);
    }
}

#[proc_macro]
pub fn table_create(input: TokenStream) -> TokenStream {
    let input: TableDef = parse_macro_input!(input as TableDef);
    let table_name = &input.table_name;
    let columns: Vec<_> = input
        .columns
        .iter()
        .map(|col| col.with_table(table_name))
        .collect();

    let expanded = quote! {
        Table::create()
            .table(#table_name::Table)
            .if_not_exists()
            #(#columns)*
            .to_owned()
    };

    expanded.into()
}
