use derive_more::Display;

#[derive(Debug, Display)]
pub enum CoreError {
    #[display("Std Error")]
    StdError,
}

impl AsRef<str> for CoreError {
    fn as_ref(&self) -> &str {
        "error"
    }
}
